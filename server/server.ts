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
const POINTS_PER_REAL = 100;  // R$1 = 100 pontos (estilo RCI)
const GOLD_MODE_PRICE = 200;  // R$200 para Modo Ouro
const GOLD_MODE_DAYS = 30;    // Modo Ouro valido por 30 dias

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

//  Engine de Valoracao de Semanas em Pontos 
// Fatores: temporada, tipo unidade, capacidade, estado, estrelas, avaliacao,
//          duracao, docs_verified
function calcularPontosSemana(data: {
  temporada: string;
  tipo_unidade: string;
  capacidade: string | number;
  estado: string;
  estrelas: number;
  avaliacao: number;
  check_in: string;
  check_out: string;
  docs_verified?: boolean;
}): number {
  // 1. Base por temporada
  const t = (data.temporada || '').toLowerCase().replace(/\s+/g, '');
  const base = t.startsWith('alt') ? 150000 : t.startsWith('bai') ? 60000 : 100000;

  // 2. Multiplicador tipo de unidade
  const tipo = (data.tipo_unidade || '').toLowerCase();
  let tipoMult = 1.0;
  if (/studio|flat|kitnet/.test(tipo)) tipoMult = 0.85;
  else if (/3\s*q|tres|tr[ei]s/.test(tipo)) tipoMult = 1.50;
  else if (/2\s*q|dois|duas/.test(tipo)) tipoMult = 1.25;

  // 3. Multiplicador capacidade (numero de pessoas)
  const cap = Number(data.capacidade) || 2;
  const capMult = cap >= 8 ? 1.35 : cap >= 6 ? 1.20 : cap >= 4 ? 1.10 : 1.0;

  // 4. Multiplicador estado (localizacao premium no Brasil)
  const estadoMults: Record<string, number> = {
    SC: 1.30, RJ: 1.30, PE: 1.25, BA: 1.20, CE: 1.15, SP: 1.10, ES: 1.05,
  };
  const estadoMult = estadoMults[(data.estado || '').toUpperCase().trim()] || 1.0;

  // 5. Multiplicador estrelas (1 a 5)
  const estrelas = Math.min(5, Math.max(1, Math.round(Number(data.estrelas) || 3)));
  const estrelasMults: Record<number, number> = { 5: 1.40, 4: 1.20, 3: 1.0, 2: 0.80, 1: 0.60 };
  const estrelasMult = estrelasMults[estrelas] ?? 1.0;

  // 6. Multiplicador avaliacao (0 a 5 estrelas de usuarios)
  const av = Math.min(5, Math.max(0, Number(data.avaliacao) || 3));
  const avaliacaoMult = av >= 4.5 ? 1.20 : av >= 4.0 ? 1.10 : av >= 3.0 ? 1.00 : av >= 2.0 ? 0.90 : 0.80;

  // 7. Multiplicador duracao (dias entre check-in e check-out)
  const dias = Math.max(1, Math.round(
    (new Date(data.check_out).getTime() - new Date(data.check_in).getTime()) / 86400000
  ));
  const duracaoMult = dias >= 14 ? 1.30 : dias >= 7 ? 1.00 : dias >= 5 ? 0.90 : 0.70;

  // 8. Bonus por documentos verificados pelo admin
  const docsMult = data.docs_verified ? 1.10 : 1.0;

  const raw = base * tipoMult * capMult * estadoMult * estrelasMult * avaliacaoMult * duracaoMult * docsMult;
  return Math.round(raw / 1000) * 1000; // arredondado ao milhar mais proximo
}

function labelPontosSemana(pontos: number): string {
  if (pontos >= 200000) return 'Premium';
  if (pontos >= 140000) return 'Luxo';
  if (pontos >= 100000) return 'Superior';
  if (pontos >= 70000)  return 'Standard';
  return 'Economica';
}

// Taxa fixa de finalizacao por pais (cobrada em dinheiro via Asaas, NAO em pontos)
// Brasil: R$100 | Internacional: USD 50 = ~R$255 (USD_TO_BRL = 5.10)
const USD_TO_BRL       = 5.10;
const EXCHANGE_FEE_USD = 50;                              // USD 50
const EXCHANGE_FEE_BRL_REAIS = 100;                       // R$100
const EXCHANGE_FEE_INT_REAIS = Math.round(EXCHANGE_FEE_USD * USD_TO_BRL); // R$255

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

    const contractPdfUrl = weekData.contractPdfUrl || null;
    const resortProofPdfUrl = weekData.resortProofPdfUrl || null;
    const authLetterAccepted = weekData.authLetterAccepted === true;

        // Calcular pontos automaticamente com base nos dados da semana
    const estrelas_val = Number(weekData.estrelas) || 3;
    const avaliacao_val = Number(weekData.avaliacao) || 3;
    const week_points = calcularPontosSemana({
      temporada: weekData.temporada || '',
      tipo_unidade: weekData.tipoUnidade || '',
      capacidade: weekData.capacidade || '2',
      estado: weekData.estado || '',
      estrelas: estrelas_val,
      avaliacao: avaliacao_val,
      check_in: weekData.checkIn,
      check_out: weekData.checkOut,
      docs_verified: false,
    });
    const week_label = labelPontosSemana(week_points);

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
      contract_pdf_url: contractPdfUrl,
      resort_proof_pdf_url: resortProofPdfUrl,
      auth_letter_accepted: authLetterAccepted,
      docs_verified: false,
      gold_mode: false,
      estrelas: estrelas_val,
      avaliacao: avaliacao_val,
      week_points,
      week_label,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ success: true, weekId: weekRef.id });
  } catch (error) {
    console.error('Erro ao submeter semana:', error);
    res.status(500).json({ error: 'Erro ao submeter semana' });
  }
});

// Iniciar troca (gratuito - taxa de R$100 cobrada apenas na finalizacao)
app.post('/api/initiate-exchange', express.json(), verifyToken, checkRiskLocked, async (req, res) => {
  try {
    const { userId, offeredWeekId, requestedWeekId } = req.body;

    if (!offeredWeekId || !requestedWeekId) {
      return res.status(400).json({ error: 'IDs das semanas sao obrigatorios' });
    }
    if (offeredWeekId === requestedWeekId) {
      return res.status(400).json({ error: 'Nao e possivel trocar uma semana consigo mesmo' });
    }

    let exchangeId = '';

    await db.runTransaction(async (transaction) => {
      const offeredWeekRef = db.collection('weeks').doc(offeredWeekId);
      const requestedWeekRef = db.collection('weeks').doc(requestedWeekId);

      const [offeredWeek, requestedWeek] = await Promise.all([
        transaction.get(offeredWeekRef),
        transaction.get(requestedWeekRef),
      ]);

      if (!offeredWeek.exists || !requestedWeek.exists) {
        throw Object.assign(new Error('Semana nao encontrada'), { statusCode: 404 });
      }
      if (offeredWeek.data()?.owner_id !== userId) {
        throw Object.assign(new Error('Voce nao e o dono desta semana'), { statusCode: 403 });
      }
      if (offeredWeek.data()?.status !== 'available') {
        throw Object.assign(new Error('Sua semana nao esta disponivel para troca'), { statusCode: 400 });
      }
      if (requestedWeek.data()?.status !== 'available') {
        throw Object.assign(new Error('A semana solicitada nao esta mais disponivel'), { statusCode: 400 });
      }
      if (requestedWeek.data()?.owner_id === userId) {
        throw Object.assign(new Error('Voce nao pode solicitar sua propria semana'), { statusCode: 400 });
      }

      // Registrar pontos de cada semana para exibicao (sem cobranca agora)
      const oData = offeredWeek.data()!;
      const rData = requestedWeek.data()!;
      const reqPts: number = oData.week_points || calcularPontosSemana({
        temporada: oData.temporada || '', tipo_unidade: oData.tipo_unidade || '',
        capacidade: oData.capacidade || '2', estado: oData.estado || '',
        estrelas: oData.estrelas || 3, avaliacao: oData.avaliacao || 3,
        check_in: oData.check_in || '', check_out: oData.check_out || '',
        docs_verified: oData.docs_verified || false,
      });
      const ownerPts: number = rData.week_points || calcularPontosSemana({
        temporada: rData.temporada || '', tipo_unidade: rData.tipo_unidade || '',
        capacidade: rData.capacidade || '2', estado: rData.estado || '',
        estrelas: rData.estrelas || 3, avaliacao: rData.avaliacao || 3,
        check_in: rData.check_in || '', check_out: rData.check_out || '',
        docs_verified: rData.docs_verified || false,
      });

      // Marcar semana solicitada como em negociacao
      transaction.update(requestedWeekRef, { status: 'pending_exchange' });

      const newExchangeRef = db.collection('exchanges').doc();
      exchangeId = newExchangeRef.id;
      transaction.set(newExchangeRef, {
        requester_id: userId,
        owner_id: rData.owner_id,
        offered_week_id: offeredWeekId,
        requested_week_id: requestedWeekId,
        req_points: reqPts,
        owner_points: ownerPts,
        exchange_fee_brl_reais: EXCHANGE_FEE_BRL_REAIS,
        exchange_fee_int_reais: EXCHANGE_FEE_INT_REAIS,
        exchange_status: 'pending',
        exchange_locked: false,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    // Diferencial de pontos (para o frontend informar o solicitante)
    // Calculado fora da transacao mas os valores ja estao salvos no doc
    const exDoc = await db.collection('exchanges').doc(exchangeId).get();
    const exData = exDoc.data()!;
    const differential = (exData.owner_points || 0) - (exData.req_points || 0); // positivo = solicitante precisa comprar pts

    res.json({
      success: true,
      exchangeId,
      differential,                              // pts que o solicitante precisara comprar (se > 0)
      feeBRL: EXCHANGE_FEE_BRL_REAIS,            // R$100
      feeINT: EXCHANGE_FEE_INT_REAIS,            // R$255 (USD50 × 5.10)
    });
  } catch (error: any) {
    console.error('Erro ao iniciar troca:', error);
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message || 'Erro ao iniciar troca' });
  }
});

// Confirmar troca (owner aceita a proposta - sem custo)
app.post('/api/confirm-exchange', express.json(), verifyToken, checkRiskLocked, async (req, res) => {
  try {
    const { userId, exchangeId } = req.body;
    const exchangeRef = db.collection('exchanges').doc(exchangeId);
    const exchangeDoc = await exchangeRef.get();

    if (!exchangeDoc.exists) return res.status(404).json({ error: 'Troca nao encontrada' });
    const data = exchangeDoc.data()!;

    if (data.owner_id !== userId) return res.status(403).json({ error: 'Apenas o dono pode confirmar' });
    if (data.exchange_status !== 'pending') return res.status(400).json({ error: 'Troca nao esta pendente' });

    await exchangeRef.update({
      exchange_status: 'confirmed',
      confirmed_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao confirmar troca:', error);
    res.status(500).json({ error: error.message || 'Erro ao confirmar troca' });
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

// ─── Helper: finalizar troca apos taxa paga (chamado pelo webhook Asaas) ──────
async function finalizarTrocaAposTaxa(
  exchangeId: string,
  ownerId: string,
  country: string,
  feeReais: number,
  asaasPaymentId: string
): Promise<void> {
  const exchangeRef = db.collection('exchanges').doc(exchangeId);
  const feeLabel = country === 'INTERNATIONAL'
    ? `USD ${EXCHANGE_FEE_USD} (R$${feeReais.toFixed(2)})`
    : `R$${feeReais.toFixed(2)}`;

  const exData = await db.runTransaction(async (transaction) => {
    const exchangeSnap = await transaction.get(exchangeRef);
    if (!exchangeSnap.exists) throw new Error('Troca nao encontrada');
    const exD = exchangeSnap.data()!;

    if (exD.exchange_status === 'FINALIZED') throw new Error('Troca ja finalizada');
    if (exD.exchange_locked) throw new Error('Troca travada');

    transaction.update(exchangeRef, {
      exchange_status: 'FINALIZED',
      exchange_locked: true,
      fee_reais: feeReais,
      fee_country: country,
      fee_label: feeLabel,
      fee_payer: ownerId,
      fee_asaas_payment_id: asaasPaymentId,
      finalized_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    const offeredWeekRef  = db.collection('weeks').doc(exD.offered_week_id);
    const requestedWeekRef = db.collection('weeks').doc(exD.requested_week_id);
    transaction.update(offeredWeekRef,  { status: 'exchanged' });
    transaction.update(requestedWeekRef, { status: 'exchanged' });

    return exD;
  });

  try {
    await updateGlobalStats(feeReais, 1);
    await distributeReferralBonus(exData.requester_id, feeReais);
    await logAudit('EXCHANGE_FINALIZED', ownerId, {
      exchange_id: exchangeId,
      fee_reais: feeReais,
      fee_country: country,
      asaas_payment_id: asaasPaymentId,
      owner_id: exData.owner_id,
      requester_id: exData.requester_id,
    });
  } catch (postErr) {
    console.error('Erro pos-finalizacao (nao critico):', postErr);
  }
}

// Criar cobranca Asaas para taxa de finalizacao de troca (sem pontos)
app.post('/api/create-exchange-fee-payment', express.json(), paymentLimiter, verifyToken, checkRiskLocked, async (req, res) => {
  try {
    const { userId, exchangeId, billingType, cpf, country } = req.body;
    if (!exchangeId) return res.status(400).json({ error: 'exchangeId obrigatorio' });

    const userCountry: string = country === 'INTERNATIONAL' ? 'INTERNATIONAL' : 'BR';
    const feeReais: number    = userCountry === 'INTERNATIONAL' ? EXCHANGE_FEE_INT_REAIS : EXCHANGE_FEE_BRL_REAIS;
    const feeLabel: string    = userCountry === 'INTERNATIONAL'
      ? `Taxa WeekSwap — USD ${EXCHANGE_FEE_USD} (R$${feeReais.toFixed(2)})`
      : `Taxa WeekSwap — R$${feeReais.toFixed(2)}`;

    const bt = (billingType || 'PIX').toUpperCase();
    if (!['PIX', 'BOLETO', 'CREDIT_CARD'].includes(bt)) {
      return res.status(400).json({ error: 'billingType invalido' });
    }

    // Verificar que a troca existe e que o usuario e o dono
    const exchangeDoc = await db.collection('exchanges').doc(exchangeId).get();
    if (!exchangeDoc.exists) return res.status(404).json({ error: 'Troca nao encontrada' });
    const exData = exchangeDoc.data()!;
    if (exData.owner_id !== userId) return res.status(403).json({ error: 'Apenas o dono da semana paga a taxa' });
    if (exData.exchange_status !== 'confirmed') return res.status(400).json({ error: 'A troca precisa estar confirmada primeiro' });
    if (exData.exchange_status === 'FINALIZED') return res.status(400).json({ error: 'Troca ja finalizada' });

    // Verificar se ja existe taxa pendente ou paga
    const existingFeeQ = await db.collection('exchange_fee_payments')
      .where('exchange_id', '==', exchangeId)
      .where('status', 'in', ['PENDING', 'CONFIRMED'])
      .limit(1).get();
    if (!existingFeeQ.empty) {
      return res.status(400).json({ error: 'Ja existe cobranca de taxa para esta troca' });
    }

    // Buscar ou criar cliente Asaas
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'Usuario nao encontrado' });
    const userData = userDoc.data()!;
    const cpfCnpj = cpf || userData.cpf || '';
    let asaasCustomerId = userData.asaas_customer_id;

    if (!asaasCustomerId) {
      if (!cpfCnpj) return res.status(400).json({ error: 'CPF obrigatorio para criar cobranca' });
      const customer = await asaasRequest('/customers', 'POST', {
        name: userData.name || 'Cliente WeekSwap',
        email: userData.email,
        cpfCnpj,
        externalReference: userId,
      });
      if (!customer.id) return res.status(500).json({ error: 'Erro ao criar cliente no gateway' });
      asaasCustomerId = customer.id;
      const upd: Record<string, any> = { asaas_customer_id: asaasCustomerId };
      if (cpf) upd.cpf = cpf;
      await db.collection('users').doc(userId).update(upd);
    }

    // Criar cobranca Asaas
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    const payment = await asaasRequest('/payments', 'POST', {
      customer: asaasCustomerId,
      billingType: bt,
      value: feeReais,
      dueDate: dueDateStr,
      description: feeLabel,
      externalReference: `fee_${exchangeId}_${userId}`,
    });

    if (!payment.id) {
      console.error('Erro ao criar cobranca Asaas (taxa troca):', JSON.stringify(payment));
      return res.status(500).json({ error: 'Erro ao criar cobranca', details: payment.errors || payment });
    }

    // Registrar no Firestore (sem pontos)
    await db.collection('exchange_fee_payments').add({
      exchange_id: exchangeId,
      user_id: userId,
      country: userCountry,
      fee_reais: feeReais,
      fee_label: feeLabel,
      billing_type: bt,
      asaas_payment_id: payment.id,
      status: 'PENDING',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    // PIX
    let pixData = null;
    let boletoUrl = '';
    if (bt === 'PIX') {
      const pixInfo = await asaasRequest(`/payments/${payment.id}/pixQrCode`, 'GET');
      pixData = {
        qrCodeImage: pixInfo.encodedImage,
        copyPaste: pixInfo.payload,
        expirationDate: pixInfo.expirationDate,
      };
    }
    if (bt === 'BOLETO') boletoUrl = payment.bankSlipUrl || '';

    res.json({
      success: true,
      paymentId: payment.id,
      billingType: bt,
      value: feeReais,
      feeLabel,
      pixData,
      boletoUrl,
      invoiceUrl: payment.invoiceUrl || '',
    });
  } catch (error: any) {
    console.error('Erro ao criar cobranca de taxa de troca:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao criar cobranca' });
  }
});

// Finalizar troca (rota legada/admin - apenas verifica se taxa foi paga)
app.post('/api/complete-exchange', express.json(), verifyToken, checkRiskLocked, async (req, res) => {
  try {
    const { userId, exchangeId } = req.body;
    if (!exchangeId) return res.status(400).json({ error: 'exchangeId obrigatorio' });

    const exchangeDoc = await db.collection('exchanges').doc(exchangeId).get();
    if (!exchangeDoc.exists) return res.status(404).json({ error: 'Troca nao encontrada' });
    const exData = exchangeDoc.data()!;

    if (exData.owner_id !== userId) return res.status(403).json({ error: 'Apenas o dono pode finalizar a troca' });
    if (exData.exchange_status === 'FINALIZED') return res.status(400).json({ error: 'Troca ja finalizada' });
    if (exData.exchange_status !== 'confirmed') return res.status(400).json({ error: 'Troca precisa estar confirmada primeiro' });

    // Verificar se a taxa foi paga
    const feeQ = await db.collection('exchange_fee_payments')
      .where('exchange_id', '==', exchangeId)
      .where('status', '==', 'CONFIRMED')
      .limit(1).get();

    if (feeQ.empty) {
      return res.status(402).json({
        error: 'A taxa de finalizacao ainda nao foi paga. Use o botao "Pagar Taxa e Finalizar" para gerar o pagamento.',
      });
    }

    res.json({ success: true, message: 'Taxa ja paga — troca sera finalizada automaticamente pelo webhook.' });
  } catch (error: any) {
    console.error('Erro ao verificar complete-exchange:', error);
    res.status(500).json({ error: error.message || 'Erro' });
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
// GET: verificacao de existencia do endpoint pelo Asaas
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

      // ── Verificar se e taxa de finalizacao de troca (sem pontos) ──────────
      const feeQ = await db.collection('exchange_fee_payments')
        .where('asaas_payment_id', '==', payment.id)
        .limit(1).get();

      if (!feeQ.empty) {
        const feeDoc = feeQ.docs[0];
        const feeData = feeDoc.data();
        if (feeData.status === 'PENDING') {
          try {
            await finalizarTrocaAposTaxa(
              feeData.exchange_id,
              feeData.user_id,
              feeData.country,
              feeData.fee_reais,
              payment.id
            );
            await feeDoc.ref.update({
              status: 'CONFIRMED',
              confirmed_at: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`Taxa de troca confirmada e troca finalizada: ${feeData.exchange_id}`);
          } catch (feeErr: any) {
            console.error('Erro ao finalizar troca via webhook de taxa:', feeErr.message);
          }
        }
        return res.json({ received: true });
      }

      // ── Pagamento de compra de pontos ─────────────────────────────────────
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

      // Auto-ativar Modo Ouro se houver gold_payment associado
      const goldQuery = await db.collection('gold_payments')
        .where('asaas_payment_id', '==', payment.id).limit(1).get();
      if (!goldQuery.empty) {
        const gDoc = goldQuery.docs[0];
        const gData = gDoc.data();
        if (gData.status !== 'ACTIVE') {
          const goldExpires = new Date();
          goldExpires.setDate(goldExpires.getDate() + GOLD_MODE_DAYS);
          const gb = db.batch();
          gb.update(db.collection('weeks').doc(gData.week_id), {
            gold_mode: true,
            gold_expires_at: admin.firestore.Timestamp.fromDate(goldExpires),
            gold_activated_at: admin.firestore.FieldValue.serverTimestamp(),
          });
          gb.update(gDoc.ref, { status: 'ACTIVE', activated_at: admin.firestore.FieldValue.serverTimestamp() });
          await gb.commit();
          console.log(`Modo Ouro ativado automaticamente: ${gData.week_id}`);
        }
      }
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

    // Criar cobranca (value em R$ para Asaas, pontos = amount * POINTS_PER_REAL)
    const pontosRecebidos = amount * POINTS_PER_REAL;
    const payment = await asaasRequest('/payments', 'POST', {
      customer: asaasCustomerId,
      billingType,
      value: amount,
      dueDate: dueDateStr,
      description: `${pontosRecebidos} pontos WeekSwap (R$${amount.toFixed(2)})`,
      externalReference: `${userId}_${Date.now()}`,
    });

    if (!payment.id) {
      console.error('Erro ao criar cobranÃƒÂ§a Asaas:', JSON.stringify(payment));
      return res.status(500).json({ error: 'Erro ao criar cobranÃƒÂ§a', details: payment.errors || payment });
    }

    // Registrar lote de pontos pendente (100 pontos por R$1)
    await db.collection('credit_batches').add({
      user_id: userId,
      amount: pontosRecebidos,
      amount_reais: amount,
      status: 'PENDING_CLEARANCE',
      asaas_payment_id: payment.id,
      asaas_billing_type: billingType,
      exchange_id: exchangeId || null,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Incrementar pending_credits (em pontos)
    await db.collection('users').doc(userId).update({
      pending_credits: admin.firestore.FieldValue.increment(pontosRecebidos),
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

// Criar cobranca Modo Ouro (R$200 para destacar semana no topo)
app.post('/api/create-gold-payment', express.json(), paymentLimiter, verifyToken, checkRiskLocked, async (req, res) => {
  try {
    const { userId, weekId, billingType = 'PIX', cpf } = req.body;
    if (!weekId) return res.status(400).json({ error: 'weekId e obrigatorio' });

    const weekDoc = await db.collection('weeks').doc(weekId).get();
    if (!weekDoc.exists) return res.status(404).json({ error: 'Semana nao encontrada' });
    if (weekDoc.data()?.owner_id !== userId) return res.status(403).json({ error: 'Voce nao e o dono desta semana' });

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'Usuario nao encontrado' });
    const userData = userDoc.data()!;

    const cpfCnpj = cpf || userData.cpf || '';
    let asaasCustomerId = userData.asaas_customer_id;

    if (!asaasCustomerId) {
      if (!cpfCnpj) return res.status(400).json({ error: 'CPF e obrigatorio' });
      const customer = await asaasRequest('/customers', 'POST', {
        name: userData.name || 'Cliente WeekSwap',
        email: userData.email,
        cpfCnpj,
        externalReference: userId,
      });
      if (!customer.id) return res.status(500).json({ error: 'Erro ao criar cliente Asaas' });
      asaasCustomerId = customer.id;
      const upd: Record<string, any> = { asaas_customer_id: asaasCustomerId };
      if (cpf) upd.cpf = cpf;
      await db.collection('users').doc(userId).update(upd);
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);
    const dueDateStr = dueDate.toISOString().split('T')[0];
    const validTypes = ['PIX', 'BOLETO', 'CREDIT_CARD'];
    const bt = validTypes.includes(billingType) ? billingType : 'PIX';

    const payment = await asaasRequest('/payments', 'POST', {
      customer: asaasCustomerId,
      billingType: bt,
      value: GOLD_MODE_PRICE,
      dueDate: dueDateStr,
      description: `Modo Ouro WeekSwap — semana ${weekId.slice(0, 8)} (30 dias)`,
      externalReference: `gold_${userId}_${weekId}_${Date.now()}`,
    });

    if (!payment.id) {
      return res.status(500).json({ error: 'Erro ao criar cobranca Modo Ouro', details: payment.errors || payment });
    }

    await db.collection('gold_payments').add({
      user_id: userId,
      week_id: weekId,
      asaas_payment_id: payment.id,
      billing_type: bt,
      value: GOLD_MODE_PRICE,
      status: 'PENDING',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    let pixData = null;
    let boletoUrl = null;
    if (bt === 'PIX') {
      const pixInfo = await asaasRequest(`/payments/${payment.id}/pixQrCode`, 'GET');
      pixData = { qrCodeImage: pixInfo.encodedImage, copyPaste: pixInfo.payload, expirationDate: pixInfo.expirationDate };
    } else if (bt === 'BOLETO') {
      boletoUrl = payment.bankSlipUrl || null;
    }

    res.json({ success: true, paymentId: payment.id, billingType: bt, value: GOLD_MODE_PRICE, pixData, boletoUrl, invoiceUrl: payment.invoiceUrl });
  } catch (error: any) {
    console.error('Erro ao criar pagamento Modo Ouro:', error);
    res.status(500).json({ error: error.message || 'Erro ao criar pagamento Modo Ouro' });
  }
});

// Ativar Modo Ouro apos confirmacao de pagamento
app.post('/api/activate-gold-mode', express.json(), verifyToken, async (req, res) => {
  try {
    const { userId, weekId, paymentId } = req.body;
    if (!weekId || !paymentId) return res.status(400).json({ error: 'weekId e paymentId sao obrigatorios' });

    const payment = await asaasRequest(`/payments/${paymentId}`, 'GET');
    if (!['RECEIVED', 'CONFIRMED'].includes(payment.status)) {
      return res.status(400).json({ error: `Pagamento nao confirmado. Status: ${payment.status}` });
    }

    const gpQuery = await db.collection('gold_payments')
      .where('asaas_payment_id', '==', paymentId)
      .where('user_id', '==', userId)
      .limit(1).get();
    if (gpQuery.empty) return res.status(404).json({ error: 'Pagamento Modo Ouro nao encontrado' });

    const gpDoc = gpQuery.docs[0];
    if (gpDoc.data().status === 'ACTIVE') return res.json({ success: true, message: 'Modo Ouro ja ativado' });

    const goldExpires = new Date();
    goldExpires.setDate(goldExpires.getDate() + GOLD_MODE_DAYS);

    const batch = db.batch();
    batch.update(db.collection('weeks').doc(weekId), {
      gold_mode: true,
      gold_expires_at: admin.firestore.Timestamp.fromDate(goldExpires),
      gold_activated_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    batch.update(gpDoc.ref, { status: 'ACTIVE', activated_at: admin.firestore.FieldValue.serverTimestamp() });
    await batch.commit();

    await logAudit('GOLD_MODE_ACTIVATED', userId, { week_id: weekId, payment_id: paymentId, expires_at: goldExpires });
    res.json({ success: true, goldExpiresAt: goldExpires.toISOString() });
  } catch (error: any) {
    console.error('Erro ao ativar Modo Ouro:', error);
    res.status(500).json({ error: error.message || 'Erro ao ativar Modo Ouro' });
  }
});

// Verificar status do pagamento Modo Ouro
app.get('/api/gold-payment-status/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await asaasRequest(`/payments/${paymentId}`, 'GET');
    res.json({ status: payment.status, value: payment.value });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao verificar pagamento' });
  }
});

// Buscar semanas disponiveis (Modo Ouro sempre primeiro)
app.get('/api/weeks', async (req, res) => {
  try {
    const snapshot = await db
      .collection('weeks')
      .where('status', '==', 'available')
      .limit(100)
      .get();

    const now = new Date();
    const weeks = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        const goldExpires = data.gold_expires_at?.toDate?.();
        const isGoldActive = data.gold_mode === true && goldExpires && goldExpires > now;
        return { id: doc.id, ...data, is_gold_active: isGoldActive };
      })
      .sort((a: any, b: any) => {
        if (a.is_gold_active && !b.is_gold_active) return -1;
        if (!a.is_gold_active && b.is_gold_active) return 1;
        return (b.created_at?._seconds || 0) - (a.created_at?._seconds || 0);
      });

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

  if (batchQuery.empty) {
    console.error('Lote de crÃƒÂ©ditos nÃƒÂ£o encontrado para dispute:', paymentIntent);
    return;
  }

  const batchDoc = batchQuery.docs[0];
  const batchData = batchDoc.data();
  const userId = batchData.user_id;
  const amount = batchData.amount;
  const userRef = db.collection('users').doc(userId);

  // BLOQUEIA A CONTA IMEDIATAMENTE
  const updateData: Record<string, any> = {
    account_status: 'RISK_LOCKED',
    risk_locked_at: admin.firestore.FieldValue.serverTimestamp(),
    risk_reason: 'chargeback_dispute',
    dispute_id: dispute.id,
  };

  // Reverter crÃƒÂ©ditos com base no status do lote
  if (batchData.status === 'AVAILABLE') {
    updateData.credits_balance = admin.firestore.FieldValue.increment(-amount);
  } else if (batchData.status === 'PENDING_CLEARANCE') {
    updateData.pending_credits = admin.firestore.FieldValue.increment(-amount);
  }

  await userRef.update(updateData);

  // Marcar o lote como disputado
  await batchDoc.ref.update({
    status: 'DISPUTED',
    dispute_id: dispute.id,
    disputed_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  await logAudit('CHARGEBACK_DISPUTE_CREATED', userId, {
    dispute_id: dispute.id,
    amount_reversed: amount,
    batch_status: batchData.status,
  });
  console.log(`CONTA BLOQUEADA: ${userId} por disputa ${dispute.id}`);
}

async function handleDisputeClosed(dispute: Stripe.Dispute) {
  const paymentIntent = dispute.payment_intent as string;

  const batchQuery = await db
    .collection('credit_batches')
    .where('stripe_payment_intent', '==', paymentIntent)
    .limit(1)
    .get();

  if (batchQuery.empty) return;

  const batchDoc = batchQuery.docs[0];
  const batchData = batchDoc.data();

  if (dispute.status === 'won') {
    // Plataforma ganhou a disputa - restaurar crÃƒÂ©ditos
    const userRef = db.collection('users').doc(batchData.user_id);
    await userRef.update({
      credits_balance: admin.firestore.FieldValue.increment(batchData.amount),
    });

    await batchDoc.ref.update({
      status: 'AVAILABLE',
      dispute_resolved_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    await logAudit('CHARGEBACK_DISPUTE_WON', batchData.user_id, {
      dispute_id: dispute.id,
      amount_restored: batchData.amount,
    });
    console.log(`Disputa vencida: crÃƒÂ©ditos restaurados para ${batchData.user_id}`);
  }
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Audit Log Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

async function logAudit(action: string, userId: string, data: Record<string, any>) {
  try {
    await db.collection('audit_logs').add({
      action,
      user_id: userId,
      ...data,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error('Erro ao gravar audit_log:', err);
  }
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ UtilitÃƒÂ¡rios Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function getReferralRate(referralCount: number): number {
  if (referralCount >= 51) return 0.025;
  if (referralCount >= 21) return 0.020;
  if (referralCount >= 6)  return 0.015;
  return 0.010;
}

async function distributeReferralBonus(userId: string, tradeAmount: number) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return;

    const referredBy = userDoc.data()?.referred_by;
    if (!referredBy) return;

    // Buscar o indicador pelo referral_code
    const referrerQuery = await db
      .collection('users')
      .where('referral_code', '==', referredBy)
      .limit(1)
      .get();

    if (referrerQuery.empty) return;

    const referrerDoc = referrerQuery.docs[0];
    const referrerData = referrerDoc.data();
    const referralCount = referrerData.referral_count || 0;
    const rate = getReferralRate(referralCount);
    const bonus = Math.floor(tradeAmount * rate);

    if (bonus <= 0) return;

    await referrerDoc.ref.update({
      referral_credits: admin.firestore.FieldValue.increment(bonus),
    });

    console.log(`BÃƒÂ´nus de indicaÃƒÂ§ÃƒÂ£o: ${bonus} crÃƒÂ©ditos para ${referrerDoc.id}`);
  } catch (error) {
    console.error('Erro ao distribuir bÃƒÂ´nus de indicaÃƒÂ§ÃƒÂ£o:', error);
  }
}

async function updateGlobalStats(commissionAmount: number, exchangeCount: number) {
  const statsRef = db.collection('platform').doc('stats');
  await statsRef.set(
    {
      total_commission: admin.firestore.FieldValue.increment(commissionAmount),
      total_exchanges: admin.firestore.FieldValue.increment(exchangeCount),
      last_updated: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ InicializaÃƒÂ§ÃƒÂ£o Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
app.listen(PORT, () => {
  console.log(`WeekSwap server running on port ${PORT}`);
});

export default app;
