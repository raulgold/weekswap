import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { config } from 'dotenv';
import rateLimit from 'express-rate-limit';

// Carregar variÃƒÂ¡veis de ambiente
config();

const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ ConfiguraÃƒÂ§ÃƒÂ£o Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const app = express();
const PORT = process.env.PORT || 3001;
const COMMISSION_RATE = 0.10; // 10% de comissÃƒÂ£o

// Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});
const db = admin.firestore();

// Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-10-28.acacia' as Stripe.LatestApiVersion,
});
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Asaas
const ASAAS_API_KEY = process.env.ASAAS_API_KEY!;
const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://api.asaas.com/v3';
const ASAAS_WEBHOOK_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN || '';

async function asaasRequest(path: string, method: string, body?: any): Promise<any> {
  const res = await fetch(`${ASAAS_API_URL}${path}`, {
    method,
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'access_token': ASAAS_API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Rate Limiting Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisiÃƒÂ§ÃƒÂµes. Tente novamente em alguns minutos.' },
});

const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limite de cobranÃƒÂ§as atingido. Tente novamente em 1 hora.' },
});

// CORS
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use('/api', generalLimiter);

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Webhook do Stripe (DEVE vir ANTES do express.json global) Ã¢â€â‚¬Ã¢â€â‚¬
// O Stripe exige o body raw para validar a assinatura
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        await handleDisputeCreated(dispute);
        break;
      }

      case 'charge.dispute.closed': {
        const dispute = event.data.object as Stripe.Dispute;
        await handleDisputeClosed(dispute);
        break;
      }

      default:
        console.log(`Evento nÃƒÂ£o tratado: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    res.status(500).json({ error: 'Erro interno ao processar evento' });
  }
});

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Middleware de VerificaÃƒÂ§ÃƒÂ£o Firebase Auth Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const verifyToken = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    // Fallback: accept userId from body (legacy, less secure)
    return next();
  }
  try {
    const token = authHeader.slice(7);
    const decoded = await admin.auth().verifyIdToken(token);
    // Override userId in body with verified UID
    req.body._verifiedUid = decoded.uid;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invÃƒÂ¡lido ou expirado' });
  }
};

// Helper to get authenticated userId (verified token > body fallback)
function getAuthUserId(req: express.Request): string | null {
  return req.body._verifiedUid || req.body.userId || null;
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Middleware de Bloqueio por Risco Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const checkRiskLocked = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const userId = getAuthUserId(req);
  if (!userId) {
    return res.status(400).json({ error: 'userId ÃƒÂ© obrigatÃƒÂ³rio' });
  }
  req.body.userId = userId; // ensure body.userId is always the verified one

  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists && userDoc.data()?.account_status === 'RISK_LOCKED') {
      return res.status(403).json({
        error: 'ACCOUNT_LOCKED',
        message: 'Sua conta estÃƒÂ¡ bloqueada por motivos de seguranÃƒÂ§a. Entre em contato com o suporte.',
      });
    }
    next();
  } catch (error) {
    console.error('Erro ao verificar status de risco:', error);
    res.status(500).json({ error: 'Erro interno ao verificar conta' });
  }
};

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Rotas da API Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

// Submeter semana para troca
app.post('/api/submit-week', express.json(), verifyToken, checkRiskLocked, async (req, res) => {
  try {
    const { userId, weekData } = req.body;

    if (!weekData?.resort || !weekData?.checkIn || !weekData?.checkOut) {
      return res.status(400).json({ error: 'Dados da semana incompletos' });
    }

    // ValidaÃƒÂ§ÃƒÂ£o de datas
    const checkInDate = new Date(weekData.checkIn);
    const checkOutDate = new Date(weekData.checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return res.status(400).json({ error: 'Datas invÃƒÂ¡lidas' });
    }
    if (checkOutDate <= checkInDate) {
      return res.status(400).json({ error: 'Check-out deve ser apÃƒÂ³s o check-in' });
    }
    if (checkInDate < today) {
      return res.status(400).json({ error: 'Check-in nÃƒÂ£o pode ser no passado' });
    }

    // Prevenir semanas duplicadas
    const duplicate = await db.collection('weeks')
      .where('owner_id', '==', userId)
      .where('resort', '==', weekData.resort)
      .where('check_in', '==', weekData.checkIn)
      .where('check_out', '==', weekData.checkOut)
      .where('status', '==', 'available')
      .limit(1)
      .get();

    if (!duplicate.empty) {
      return res.status(400).json({ error: 'VocÃƒÂª jÃƒÂ¡ publicou essa semana (mesmo resort e datas)' });
    }

    const weekRef = await db.collection('weeks').add({
      owner_id: userId,
      resort: weekData.resort,
      cidade: weekData.cidade || '',
      estado: weekData.estado || '',
      check_in: weekData.checkIn,
      check_out: weekData.checkOut,
      temporada: weekData.temporada || '',
      tipo_unidade: weekData.tipoUnidade || '',
      capacidade: weekData.capacidade || '2',
      numero_certificado: weekData.numeroCertificado || '',
      descricao: weekData.descricao || '',
      observacoes: weekData.observacoes || '',
      resort_entregue: weekData.resortEntregue === true,
      status: 'available',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ success: true, weekId: weekRef.id });
  } catch (error) {
    console.error('Erro ao submeter semana:', error);
    res.status(500).json({ error: 'Erro ao submeter semana' });
  }
});

// Iniciar troca
app.post('/api/initiate-exchange', express.json(), verifyToken, checkRiskLocked, async (req, res) => {
  try {
    const { userId, offeredWeekId, requestedWeekId } = req.body;

    if (!offeredWeekId || !requestedWeekId) {
      return res.status(400).json({ error: 'IDs das semanas sÃƒÂ£o obrigatÃƒÂ³rios' });
    }

    if (offeredWeekId === requestedWeekId) {
      return res.status(400).json({ error: 'NÃƒÂ£o ÃƒÂ© possÃƒÂ­vel trocar uma semana consigo mesmo' });
    }

    // Usar transaÃƒÂ§ÃƒÂ£o para evitar race condition (dois usuÃƒÂ¡rios solicitando a mesma semana)
    let exchangeId: string;
    await db.runTransaction(async (transaction) => {
      const offeredWeekRef = db.collection('weeks').doc(offeredWeekId);
      const requestedWeekRef = db.collection('weeks').doc(requestedWeekId);

      const [offeredWeek, requestedWeek] = await Promise.all([
        transaction.get(offeredWeekRef),
        transaction.get(requestedWeekRef),
      ]);

      if (!offeredWeek.exists || !requestedWeek.exists) {
        throw Object.assign(new Error('Semana nÃƒÂ£o encontrada'), { statusCode: 404 });
      }

      if (offeredWeek.data()?.owner_id !== userId) {
        throw Object.assign(new Error('VocÃƒÂª nÃƒÂ£o ÃƒÂ© o dono desta semana'), { statusCode: 403 });
      }

      if (offeredWeek.data()?.status !== 'available') {
        throw Object.assign(new Error('Sua semana nÃƒÂ£o estÃƒÂ¡ disponÃƒÂ­vel para troca'), { statusCode: 400 });
      }

      if (requestedWeek.data()?.status !== 'available') {
        throw Object.assign(new Error('A semana solicitada nÃƒÂ£o estÃƒÂ¡ mais disponÃƒÂ­vel'), { statusCode: 400 });
      }

      if (requestedWeek.data()?.owner_id === userId) {
        throw Object.assign(new Error('VocÃƒÂª nÃƒÂ£o pode solicitar sua prÃƒÂ³pria semana'), { statusCode: 400 });
      }

      // Marcar semana solicitada como "em negociaÃƒÂ§ÃƒÂ£o" atomicamente
      transaction.update(requestedWeekRef, { status: 'pending_exchange' });

      const newExchangeRef = db.collection('exchanges').doc();
      exchangeId = newExchangeRef.id;
      transaction.set(newExchangeRef, {
        requester_id: userId,
        owner_id: requestedWeek.data()?.owner_id,
        offered_week_id: offeredWeekId,
        requested_week_id: requestedWeekId,
        exchange_status: 'pending',
        exchange_locked: false,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    res.json({ success: true, exchangeId: exchangeId! });
  } catch (error: any) {
    console.error('Erro ao iniciar troca:', error);
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message || 'Erro ao iniciar troca' });
  }
});

// Confirmar troca (owner aceita a solicitaÃƒÂ§ÃƒÂ£o)
app.post('/api/confirm-exchange', express.json(), verifyToken, checkRiskLocked, async (req, res) => {
  try {
    const { userId, exchangeId } = req.body;
    const exchangeRef = db.collection('exchanges').doc(exchangeId);
    const exchangeDoc = await exchangeRef.get();

    if (!exchangeDoc.exists) return res.status(404).json({ error: 'Troca nÃƒÂ£o encontrada' });
    const data = exchangeDoc.data()!;

    if (data.owner_id !== userId) return res.status(403).json({ error: 'Apenas o dono pode confirmar' });
    if (data.exchange_status !== 'pending') return res.status(400).json({ error: 'Troca nÃƒÂ£o estÃƒÂ¡ pendente' });

    await exchangeRef.update({ exchange_status: 'confirmed' });
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao confirmar troca:', error);
    res.status(500).json({ error: 'Erro ao confirmar troca' });
  }
});

// Cancelar troca
app.post('/api/cancel-exchange', express.json(), verifyToken, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(400).json({ error: 'userId ÃƒÂ© obrigatÃƒÂ³rio' });

    const { exchangeId } = req.body;
    const exchangeRef = db.collection('exchanges').doc(exchangeId);
    const exchangeDoc = await exchangeRef.get();

    if (!exchangeDoc.exists) return res.status(404).json({ error: 'Troca nÃƒÂ£o encontrada' });
    const data = exchangeDoc.data()!;

    if (data.owner_id !== userId && data.requester_id !== userId) {
      return res.status(403).json({ error: 'Sem permissÃƒÂ£o para cancelar' });
    }
    if (['FINALIZED', 'cancelled'].includes(data.exchange_status)) {
      return res.status(400).json({ error: 'Troca nÃƒÂ£o pode ser cancelada neste estado' });
    }

    // Restaurar status da semana solicitada para 'available'
    const batch = db.batch();
    batch.update(exchangeRef, {
      exchange_status: 'cancelled',
      cancelled_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    if (data.requested_week_id) {
      const weekRef = db.collection('weeks').doc(data.requested_week_id);
      batch.update(weekRef, { status: 'available' });
    }
    await batch.commit();
    await logAudit('EXCHANGE_CANCELLED', userId, {
      exchange_id: exchangeId,
      cancelled_by: userId,
      previous_status: data.exchange_status,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao cancelar troca:', error);
    res.status(500).json({ error: 'Erro ao cancelar troca' });
  }
});

// Finalizar troca (com lÃƒÂ³gica financeira corrigida)
app.post('/api/complete-exchange', express.json(), verifyToken, checkRiskLocked, async (req, res) => {
  try {
    const { userId, exchangeId } = req.body;

    if (!exchangeId) {
      return res.status(400).json({ error: 'exchangeId ÃƒÂ© obrigatÃƒÂ³rio' });
    }

    const exchangeRef = db.collection('exchanges').doc(exchangeId);
    const exchangeDoc = await exchangeRef.get();

    if (!exchangeDoc.exists) {
      return res.status(404).json({ error: 'Troca nÃƒÂ£o encontrada' });
    }

    const exchangeData = exchangeDoc.data()!;

    // ValidaÃƒÂ§ÃƒÂµes
    if (exchangeData.exchange_status === 'FINALIZED') {
      return res.status(400).json({ error: 'Troca jÃƒÂ¡ foi finalizada' });
    }

    if (exchangeData.exchange_locked) {
      return res.status(400).json({ error: 'Troca estÃƒÂ¡ travada' });
    }

    if (exchangeData.owner_id !== userId) {
      return res.status(403).json({ error: 'Apenas o dono pode completar a troca' });
    }

    if (exchangeData.exchange_status !== 'confirmed') {
      return res.status(400).json({ error: 'A troca precisa estar confirmada primeiro' });
    }

    // Verificar escrow
    const escrowRef = db.collection('escrows').doc(exchangeId);
    const escrowDoc = await escrowRef.get();

    if (!escrowDoc.exists) {
      return res.status(400).json({ error: 'Escrow nÃƒÂ£o encontrado para esta troca' });
    }

    const escrowData = escrowDoc.data()!;
    const totalAmount = escrowData.amount;

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ error: 'Valor do escrow invÃƒÂ¡lido' });
    }

    const commissionAmount = Math.floor(totalAmount * COMMISSION_RATE);
    const ownerAmount = totalAmount - commissionAmount;

    // TransaÃƒÂ§ÃƒÂ£o atÃƒÂ´mica
    await db.runTransaction(async (transaction) => {
      // Re-ler dentro da transaÃƒÂ§ÃƒÂ£o para garantir consistÃƒÂªncia
      const freshExchange = await transaction.get(exchangeRef);
      if (freshExchange.data()?.exchange_locked) {
        throw new Error('Troca foi travada durante o processamento');
      }

      // Atualizar a troca
      transaction.update(exchangeRef, {
        exchange_status: 'FINALIZED',
        commission_rate: COMMISSION_RATE,
        commission_amount: commissionAmount,
        owner_amount: ownerAmount,
        platform_amount: commissionAmount,
        exchange_locked: true,
        finalized_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Atualizar saldo do dono
      const ownerRef = db.collection('users').doc(exchangeData.owner_id);
      transaction.update(ownerRef, {
        credits_balance: admin.firestore.FieldValue.increment(ownerAmount),
      });

      // Atualizar status das semanas
      const offeredWeekRef = db.collection('weeks').doc(exchangeData.offered_week_id);
      const requestedWeekRef = db.collection('weeks').doc(exchangeData.requested_week_id);

      transaction.update(offeredWeekRef, { status: 'exchanged' });
      transaction.update(requestedWeekRef, { status: 'exchanged' });

      // Atualizar escrow
      transaction.update(escrowRef, {
        status: 'released',
        released_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    // Atualizar estatÃƒÂ­sticas e bÃƒÂ´nus (fora da transaÃƒÂ§ÃƒÂ£o Ã¢â‚¬â€ falhas nÃƒÂ£o afetam o resultado)
    try {
      await updateGlobalStats(commissionAmount, 1);
      await distributeReferralBonus(exchangeData.owner_id, totalAmount);
      await logAudit('EXCHANGE_FINALIZED', userId, {
        exchange_id: exchangeId,
        total_amount: totalAmount,
        commission_amount: commissionAmount,
        owner_amount: ownerAmount,
        owner_id: exchangeData.owner_id,
        requester_id: exchangeData.requester_id,
      });
    } catch (postErr) {
      console.error('Erro em operaÃƒÂ§ÃƒÂµes pÃƒÂ³s-transaÃƒÂ§ÃƒÂ£o (nÃƒÂ£o crÃƒÂ­tico):', postErr);
    }

    res.json({
      success: true,
      data: {
        exchangeId,
        totalAmount,
        commissionAmount,
        ownerAmount,
      },
    });
  } catch (error: any) {
    console.error('Erro ao finalizar troca:', error);
    res.status(500).json({ error: error.message || 'Erro ao finalizar troca' });
  }
});

// Criar sessÃƒÂ£o de checkout do Stripe
app.post('/api/create-checkout-session', express.json(), checkRiskLocked, async (req, res) => {
  try {
    const { userId, creditAmount, exchangeId } = req.body;

    if (!creditAmount || creditAmount <= 0) {
      return res.status(400).json({ error: 'Valor de crÃƒÂ©ditos invÃƒÂ¡lido' });
    }

    // PreÃƒÂ§o em centavos (R$1 = 100 centavos)
    const unitPrice = 100;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: 'CrÃƒÂ©ditos WeekSwap',
              description: `${creditAmount} crÃƒÂ©ditos para trocas`,
            },
            unit_amount: unitPrice,
          },
          quantity: creditAmount,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
      metadata: {
        userId,
        creditAmount: String(creditAmount),
        exchangeId: exchangeId || '',
      },
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Erro ao criar sessÃƒÂ£o de checkout:', error);
    res.status(500).json({ error: 'Erro ao criar sessÃƒÂ£o de pagamento' });
  }
});

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Asaas: Webhook de confirmaÃƒÂ§ÃƒÂ£o de pagamento Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
// GET: verificação de existência do endpoint pelo Asaas
app.get('/api/asaas-webhook', (_req, res) => {
  res.status(200).json({ status: 'ok', message: 'Asaas webhook endpoint ativo' });
});

app.post('/api/asaas-webhook', express.json(), async (req, res) => {
  try {
    // Verificar token de autenticaÃƒÂ§ÃƒÂ£o do webhook (configurado no painel Asaas)
    if (ASAAS_WEBHOOK_TOKEN) {
      const incomingToken = req.headers['asaas-access-token'] as string;
      if (incomingToken !== ASAAS_WEBHOOK_TOKEN) {
        console.warn('Webhook Asaas: token invÃƒÂ¡lido rejeitado');
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    const event = req.body;
    console.log('Asaas webhook:', event.event, event.payment?.id);

    if (event.event === 'PAYMENT_RECEIVED' || event.event === 'PAYMENT_CONFIRMED') {
      const payment = event.payment;
      if (!payment) return res.json({ received: true });

      // Buscar lote de crÃƒÂ©ditos pelo ID do pagamento Asaas
      const batchQuery = await db
        .collection('credit_batches')
        .where('asaas_payment_id', '==', payment.id)
        .limit(1)
        .get();

      if (batchQuery.empty) {
        console.log('Pagamento Asaas sem lote correspondente:', payment.id);
        return res.json({ received: true });
      }

      const batchDoc = batchQuery.docs[0];
      const batchData = batchDoc.data();

      // IdempotÃƒÂªncia: ignorar se jÃƒÂ¡ processado
      if (batchData.status !== 'PENDING_CLEARANCE') {
        console.log('Webhook Asaas: pagamento jÃƒÂ¡ processado', payment.id);
        return res.json({ received: true });
      }

      await db.runTransaction(async (transaction) => {
        // Todas as leituras ANTES das escritas (regra do Firestore)
        const freshBatch = await transaction.get(batchDoc.ref);
        const userRef = db.collection('users').doc(batchData.user_id);
        let escrowExists = false;
        if (batchData.exchange_id) {
          const escrowRef = db.collection('escrows').doc(batchData.exchange_id);
          const escrowSnap = await transaction.get(escrowRef);
          escrowExists = escrowSnap.exists;
        }

        if (freshBatch.data()?.status !== 'PENDING_CLEARANCE') {
          return; // Outro processo jÃƒÂ¡ confirmou
        }

        // Agora todas as escritas
        transaction.update(batchDoc.ref, {
          status: 'AVAILABLE',
          confirmed_at: admin.firestore.FieldValue.serverTimestamp(),
        });

        transaction.update(userRef, {
          credits_balance: admin.firestore.FieldValue.increment(batchData.amount),
          pending_credits: admin.firestore.FieldValue.increment(-batchData.amount),
        });

        if (batchData.exchange_id && !escrowExists) {
          const escrowRef = db.collection('escrows').doc(batchData.exchange_id);
          transaction.set(escrowRef, {
            exchange_id: batchData.exchange_id,
            amount: batchData.amount,
            payer_id: batchData.user_id,
            status: 'held',
            created_at: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      });

      await logAudit('PAYMENT_ASAAS_CONFIRMED', batchData.user_id, {
        asaas_payment_id: payment.id,
        credit_amount: batchData.amount,
        exchange_id: batchData.exchange_id || null,
      });
      console.log(`Pagamento Asaas confirmado: ${batchData.amount} crÃƒÂ©ditos para ${batchData.user_id}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Erro no webhook Asaas:', error);
    res.status(500).json({ error: 'Erro ao processar webhook' });
  }
});

// Criar cobranÃƒÂ§a Asaas (PIX, boleto ou cartÃƒÂ£o)
app.post('/api/create-asaas-payment', express.json(), paymentLimiter, verifyToken, checkRiskLocked, async (req, res) => {
  try {
    const { userId, creditAmount, exchangeId, billingType, cpf } = req.body;
    // billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD'

    const amount = Number(creditAmount);
    if (!amount || amount < 5 || amount > 100000) {
      return res.status(400).json({ error: 'Valor mÃƒÂ­nimo: R$5,00. MÃƒÂ¡ximo: R$100.000' });
    }

    const validTypes = ['PIX', 'BOLETO', 'CREDIT_CARD'];
    if (!validTypes.includes(billingType)) {
      return res.status(400).json({ error: 'Tipo de pagamento invÃƒÂ¡lido' });
    }

    // Validar exchangeId se fornecido
    if (exchangeId && !/^[a-zA-Z0-9]{10,30}$/.test(exchangeId)) {
      return res.status(400).json({ error: 'exchangeId invÃƒÂ¡lido' });
    }

    // Buscar dados do usuÃƒÂ¡rio
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'UsuÃƒÂ¡rio nÃƒÂ£o encontrado' });
    }
    const userData = userDoc.data()!;

    // Buscar ou criar cliente no Asaas
    const cpfCnpj = cpf || userData.cpf || '';
    let asaasCustomerId = userData.asaas_customer_id;

    if (!asaasCustomerId) {
      if (!cpfCnpj) {
        return res.status(400).json({ error: 'CPF ÃƒÂ© obrigatÃƒÂ³rio para criar cobranÃƒÂ§a' });
      }
      const customer = await asaasRequest('/customers', 'POST', {
        name: userData.name || 'Cliente WeekSwap',
        email: userData.email,
        cpfCnpj,
        externalReference: userId,
      });

      if (customer.id) {
        asaasCustomerId = customer.id;
        const updateData: Record<string, any> = { asaas_customer_id: asaasCustomerId };
        if (cpf) updateData.cpf = cpf;
        await db.collection('users').doc(userId).update(updateData);
      } else {
        console.error('Erro ao criar cliente Asaas:', customer);
        return res.status(500).json({ error: 'Erro ao criar cliente no gateway de pagamento' });
      }
    } else if (cpfCnpj && !userData.cpf) {
      // Cliente jÃƒÂ¡ existe no Asaas mas sem CPF Ã¢â‚¬â€ atualizar
      await asaasRequest(`/customers/${asaasCustomerId}`, 'POST', { cpfCnpj });
      await db.collection('users').doc(userId).update({ cpf: cpfCnpj });
    }

    // Data de vencimento: amanhÃƒÂ£
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    // Criar cobranÃƒÂ§a
    const payment = await asaasRequest('/payments', 'POST', {
      customer: asaasCustomerId,
      billingType,
      value: creditAmount, // R$ (1 crÃƒÂ©dito = R$1)
      dueDate: dueDateStr,
      description: `${creditAmount} crÃƒÂ©ditos WeekSwap`,
      externalReference: `${userId}_${Date.now()}`,
    });

    if (!payment.id) {
      console.error('Erro ao criar cobranÃƒÂ§a Asaas:', JSON.stringify(payment));
      return res.status(500).json({ error: 'Erro ao criar cobranÃƒÂ§a', details: payment.errors || payment });
    }

    // Registrar lote de crÃƒÂ©ditos pendente
    await db.collection('credit_batches').add({
      user_id: userId,
      amount: creditAmount,
      status: 'PENDING_CLEARANCE',
      asaas_payment_id: payment.id,
      asaas_billing_type: billingType,
      exchange_id: exchangeId || null,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Incrementar pending_credits
    await db.collection('users').doc(userId).update({
      pending_credits: admin.firestore.FieldValue.increment(creditAmount),
    });

    // Buscar dados adicionais do pagamento (QR code PIX, link boleto)
    let pixData = null;
    let boletoUrl = null;

    if (billingType === 'PIX') {
      const pixInfo = await asaasRequest(`/payments/${payment.id}/pixQrCode`, 'GET');
      pixData = {
        qrCodeImage: pixInfo.encodedImage,
        copyPaste: pixInfo.payload,
        expirationDate: pixInfo.expirationDate,
      };
    } else if (billingType === 'BOLETO') {
      boletoUrl = payment.bankSlipUrl || null;
    }

    res.json({
      success: true,
      paymentId: payment.id,
      status: payment.status,
      value: payment.value,
      billingType,
      pixData,
      boletoUrl,
      invoiceUrl: payment.invoiceUrl,
    });
  } catch (error: any) {
    console.error('Erro ao criar pagamento Asaas:', error);
    res.status(500).json({ error: error.message || 'Erro ao criar pagamento' });
  }
});

// Verificar status de pagamento Asaas
app.get('/api/asaas-payment/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await asaasRequest(`/payments/${paymentId}`, 'GET');
    res.json({ status: payment.status, value: payment.value });
  } catch (error) {
    console.error('Erro ao verificar pagamento:', error);
    res.status(500).json({ error: 'Erro ao verificar pagamento' });
  }
});

// Registrar indicaÃƒÂ§ÃƒÂ£o quando novo usuÃƒÂ¡rio se cadastra
app.post('/api/register-referral', express.json(), async (req, res) => {
  try {
    const { newUserId, referralCode } = req.body;
    if (!newUserId || !referralCode) return res.json({ success: false });

    const referrerQuery = await db
      .collection('users')
      .where('referral_code', '==', referralCode)
      .limit(1)
      .get();

    if (referrerQuery.empty) return res.json({ success: false, error: 'CÃƒÂ³digo invÃƒÂ¡lido' });

    await referrerQuery.docs[0].ref.update({
      referral_count: admin.firestore.FieldValue.increment(1),
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao registrar indicaÃƒÂ§ÃƒÂ£o:', error);
    res.status(500).json({ error: 'Erro ao registrar indicaÃƒÂ§ÃƒÂ£o' });
  }
});

// Buscar semanas disponÃƒÂ­veis
app.get('/api/weeks', async (req, res) => {
  try {
    const snapshot = await db
      .collection('weeks')
      .where('status', '==', 'available')
      .limit(50)
      .get();

    const weeks = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ weeks });
  } catch (error) {
    console.error('Erro ao buscar semanas:', error);
    res.status(500).json({ error: 'Erro ao buscar semanas' });
  }
});

// Buscar trocas do usuÃƒÂ¡rio
app.get('/api/exchanges/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const [asRequester, asOwner] = await Promise.all([
      db.collection('exchanges').where('requester_id', '==', userId).limit(100).get(),
      db.collection('exchanges').where('owner_id', '==', userId).limit(100).get(),
    ]);

    // Remover duplicatas (troca onde user ÃƒÂ© ao mesmo tempo requester e owner nÃƒÂ£o deve existir,
    // mas previne duplicar caso haja overlap)
    const seen = new Set<string>();
    const exchanges: any[] = [];

    asRequester.docs.forEach((doc) => {
      seen.add(doc.id);
      exchanges.push({ id: doc.id, role: 'requester', ...doc.data() });
    });
    asOwner.docs.forEach((doc) => {
      if (!seen.has(doc.id)) {
        exchanges.push({ id: doc.id, role: 'owner', ...doc.data() });
      }
    });

    // Ordenar por data de criaÃƒÂ§ÃƒÂ£o descendente (mais recentes primeiro)
    exchanges.sort((a, b) => {
      const aTime = a.created_at?._seconds || 0;
      const bTime = b.created_at?._seconds || 0;
      return bTime - aTime;
    });

    res.json({ exchanges });
  } catch (error) {
    console.error('Erro ao buscar trocas:', error);
    res.status(500).json({ error: 'Erro ao buscar trocas' });
  }
});

// Buscar perfil do usuÃƒÂ¡rio
app.get('/api/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'UsuÃƒÂ¡rio nÃƒÂ£o encontrado' });
    }

    const data = userDoc.data()!;
    res.json({
      uid: userDoc.id,
      name: data.name,
      email: data.email,
      credits_balance: data.credits_balance || 0,
      pending_credits: data.pending_credits || 0,
      account_status: data.account_status || 'active',
    });
  } catch (error) {
    console.error('Erro ao buscar usuÃƒÂ¡rio:', error);
    res.status(500).json({ error: 'Erro ao buscar usuÃƒÂ¡rio' });
  }
});

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Handlers do Webhook Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const creditAmount = parseInt(session.metadata?.creditAmount || '0', 10);
  const exchangeId = session.metadata?.exchangeId;

  if (!userId || !creditAmount) {
    console.error('Metadata invÃƒÂ¡lida no checkout:', session.metadata);
    return;
  }

  // Para cartÃƒÂ£o Stripe, payment_status === 'paid' significa pagamento confirmado imediatamente
  const isPaid = session.payment_status === 'paid';

  const batch = db.batch();

  // Criar registro do lote de crÃƒÂ©ditos
  const creditBatchRef = db.collection('credit_batches').doc();
  batch.set(creditBatchRef, {
    user_id: userId,
    amount: creditAmount,
    status: isPaid ? 'AVAILABLE' : 'PENDING_CLEARANCE',
    stripe_session_id: session.id,
    stripe_payment_intent: session.payment_intent,
    confirmed_at: isPaid ? admin.firestore.FieldValue.serverTimestamp() : null,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  const userRef = db.collection('users').doc(userId);
  if (isPaid) {
    // Pagamento confirmado: creditar saldo disponÃƒÂ­vel
    batch.update(userRef, {
      credits_balance: admin.firestore.FieldValue.increment(creditAmount),
    });
  } else {
    // Pagamento pendente (boleto, etc.)
    batch.update(userRef, {
      pending_credits: admin.firestore.FieldValue.increment(creditAmount),
    });
  }

  // Se associado a uma troca, criar escrow (idempotente)
  if (exchangeId) {
    const escrowRef = db.collection('escrows').doc(exchangeId);
    const escrowSnap = await escrowRef.get();
    if (!escrowSnap.exists) {
      batch.set(escrowRef, {
        exchange_id: exchangeId,
        amount: creditAmount,
        payer_id: userId,
        status: 'held',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  await batch.commit();
  await logAudit(isPaid ? 'PAYMENT_STRIPE_CONFIRMED' : 'PAYMENT_STRIPE_PENDING', userId, {
    stripe_session_id: session.id,
    credit_amount: creditAmount,
    exchange_id: exchangeId || null,
  });
  console.log(`Checkout Stripe: ${creditAmount} crÃƒÂ©ditos para ${userId} (${isPaid ? 'DISPONÃƒÂVEIS' : 'PENDENTES'})`);
}

async function handleDisputeCreated(dispute: Stripe.Dispute) {
  const paymentIntent = dispute.payment_intent as string;

  // Localizar o lote de crÃƒÂ©ditos pelo payment intent
  const batchQuery = await db
    .collection('credit_batches')
    .where('stripe_payment_intent', '==', paymentIntent)
    .limit(1)
    .get();

  if (batc