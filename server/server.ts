import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { config } from 'dotenv';
import rateLimit from 'express-rate-limit';
import admin from 'firebase-admin';
import { authMiddleware } from './middleware/auth.js';
import { createRiskLockMiddleware } from './middleware/riskLock.js';
import { createAdminMiddleware } from './middleware/admin.js';
import { createAsaasRequest } from './services/asaas.js';
import {
  calcularPontosSemana,
  labelPontosSemana,
  POINTS_PER_REAL,
  GOLD_MODE_DAYS,
  GOLD_MODE_PRICE,
} from './services/points.js';
import { logAudit } from './services/audit.js';
import { distributeReferralBonus } from './services/referral.js';
import { updateGlobalStats } from './services/stats.js';
import { createAdminRouter } from './routes/adminRoutes.js';
import { createUserRouter } from './routes/userRoutes.js';
import { createReviewRouter } from './routes/reviewRoutes.js';

// Carregar variÃƒÂ¡veis de ambiente
config();

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ ConfiguraÃƒÂ§ÃƒÂ£o Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const app = express();
const PORT = process.env.PORT || 3001;
// Constantes em services/points

// Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});
const db = admin.firestore();


const ASAAS_WEBHOOK_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN || '';
const asaasRequest = createAsaasRequest();

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Rate Limiting Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

// Engine de pontuação em services/points

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

// Protege a API inteira com Firebase Auth (exceto rotas registradas antes deste middleware)
app.use('/api', authMiddleware);

const checkRiskLocked = createRiskLockMiddleware(db);

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Rotas da API Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

// Submeter semana para troca
app.post('/api/submit-week', express.json(), checkRiskLocked, async (req, res) => {
  try {
    const userId = (req as any).user.uid;
    const { weekData } = req.body;

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

    // Prevenir semanas duplicadas por resort + datas
    const duplicate = await db.collection('weeks')
      .where('owner_id', '==', userId)
      .where('resort', '==', weekData.resort)
      .where('check_in', '==', weekData.checkIn)
      .where('check_out', '==', weekData.checkOut)
      .where('status', 'in', ['available', 'pending_exchange'])
      .limit(1)
      .get();

    if (!duplicate.empty) {
      return res.status(400).json({ error: '⚠️ Você já tem essa semana cadastrada! Veja em "Minhas Semanas".' });
    }

    // Verificação por número de certificado (evita duplicata de cota)
    const numeroCertificado = weekData.numeroCertificado?.trim();
    if (numeroCertificado) {
      const certDupQ = await db.collection('weeks')
        .where('owner_id', '==', userId)
        .where('numero_certificado', '==', numeroCertificado)
        .where('status', 'in', ['available', 'pending_exchange'])
        .limit(1)
        .get();
      if (!certDupQ.empty) {
        return res.status(400).json({
          error: 'Você já possui uma semana ativa com este número de certificado. Cancele ou remova a semana anterior antes de publicar novamente.'
        });
      }
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
app.post('/api/initiate-exchange', express.json(), checkRiskLocked, async (req, res) => {
  try {
    const userId = (req as any).user.uid;
    const { offeredWeekId, requestedWeekId } = req.body;

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

      // Validacao de diferencial: solicitante precisa ter pontos suficientes
      const differential = ownerPts - reqPts;
      if (differential > 0) {
        const requesterRef = db.collection('users').doc(userId);
        const requesterDoc = await transaction.get(requesterRef);
        const creditsBalance = requesterDoc.data()?.credits_balance || 0;
        if (creditsBalance < differential) {
          const faltam = differential - creditsBalance;
          throw Object.assign(
            new Error(
              `Saldo insuficiente para cobrir o diferencial de pontos. ` +
              `Voce precisa de ${differential.toLocaleString('pt-BR')} pts mas tem ${creditsBalance.toLocaleString('pt-BR')} pts. ` +
              `Compre mais ${faltam.toLocaleString('pt-BR')} pontos antes de solicitar esta troca.`
            ),
            { statusCode: 400, differential, creditsBalance, faltam }
          );
        }
        // DEBITAR os pontos do diferencial imediatamente
        transaction.update(requesterRef, {
          credits_balance: admin.firestore.FieldValue.increment(-differential),
        });
      }

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
        exchange_status: 'PENDING',
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
app.post('/api/confirm-exchange', express.json(), checkRiskLocked, async (req, res) => {
  try {
    const userId = (req as any).user.uid;
    const { exchangeId } = req.body;
    const exchangeRef = db.collection('exchanges').doc(exchangeId);
    const exchangeDoc = await exchangeRef.get();

    if (!exchangeDoc.exists) return res.status(404).json({ error: 'Troca nao encontrada' });
    const data = exchangeDoc.data()!;

    if (data.owner_id !== userId) return res.status(403).json({ error: 'Apenas o dono pode confirmar' });
    if (data.exchange_status !== 'PENDING') return res.status(400).json({ error: 'Troca nao esta pendente' });

    await exchangeRef.update({
      exchange_status: 'CONFIRMED',
      confirmed_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao confirmar troca:', error);
    res.status(500).json({ error: error.message || 'Erro ao confirmar troca' });
  }
});

// Cancelar troca
app.post('/api/cancel-exchange', express.json(), async (req, res) => {
  try {
    const userId = (req as any).user.uid;

    const { exchangeId } = req.body;
    const exchangeRef = db.collection('exchanges').doc(exchangeId);
    const exchangeDoc = await exchangeRef.get();

    if (!exchangeDoc.exists) return res.status(404).json({ error: 'Troca nÃƒÂ£o encontrada' });
    const data = exchangeDoc.data()!;

    if (data.owner_id !== userId && data.requester_id !== userId) {
      return res.status(403).json({ error: 'Sem permissÃƒÂ£o para cancelar' });
    }
    if (['FINALIZED', 'CANCELLED'].includes(data.exchange_status)) {
      return res.status(400).json({ error: 'Troca nÃƒÂ£o pode ser cancelada neste estado' });
    }

    // Restaurar status da semana solicitada para 'available'
    // Se houve diferencial de pontos debitado, restaurar os pontos ao solicitante
    const differential = (data.owner_points || 0) - (data.req_points || 0);
    
    const batch = db.batch();
    batch.update(exchangeRef, {
      exchange_status: 'CANCELLED',
      cancelled_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    if (data.requested_week_id) {
      const weekRef = db.collection('weeks').doc(data.requested_week_id);
      batch.update(weekRef, { status: 'available' });
    }
    // Se diferencial era positivo, restaurar os pontos debitados
    if (differential > 0) {
      const requesterRef = db.collection('users').doc(data.requester_id);
      batch.update(requesterRef, {
        credits_balance: admin.firestore.FieldValue.increment(differential),
      });
    }
    await batch.commit();
    await logAudit(db, 'EXCHANGE_CANCELLED', userId, {
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
    await updateGlobalStats(db, feeReais, 1);
    await distributeReferralBonus(db, exData.requester_id, feeReais);
    await logAudit(db, 'EXCHANGE_FINALIZED', ownerId, {
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
app.post('/api/create-exchange-fee-payment', express.json(), paymentLimiter, checkRiskLocked, async (req, res) => {
  try {
    const userId = (req as any).user.uid;
    const { exchangeId, billingType, cpf, country } = req.body;
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
    if (exData.exchange_status !== 'CONFIRMED') return res.status(400).json({ error: 'A troca precisa estar confirmada primeiro' });
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
app.post('/api/complete-exchange', express.json(), checkRiskLocked, async (req, res) => {
  try {
    const userId = (req as any).user.uid;
    const { exchangeId } = req.body;
    if (!exchangeId) return res.status(400).json({ error: 'exchangeId obrigatorio' });

    const exchangeDoc = await db.collection('exchanges').doc(exchangeId).get();
    if (!exchangeDoc.exists) return res.status(404).json({ error: 'Troca nao encontrada' });
    const exData = exchangeDoc.data()!;

    if (exData.owner_id !== userId) return res.status(403).json({ error: 'Apenas o dono pode finalizar a troca' });
    if (exData.exchange_status === 'FINALIZED') return res.status(400).json({ error: 'Troca ja finalizada' });
    if (exData.exchange_status !== 'CONFIRMED') return res.status(400).json({ error: 'Troca precisa estar confirmada primeiro' });

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

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Asaas: Webhook de confirmaÃƒÂ§ÃƒÂ£o de pagamento Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
// GET: verificacao de existencia do endpoint pelo Asaas
app.get('/api/asaas-webhook', (_req, res) => {
  res.status(200).json({ status: 'ok', message: 'Asaas webhook endpoint ativo' });
});

app.post('/api/asaas-webhook', express.json(), async (req, res) => {
  try {
    // ── Validação robusta do token de autenticação do webhook ────────────────
    const ASAAS_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN;
    if (!ASAAS_TOKEN) {
      console.error('CRÍTICO: ASAAS_WEBHOOK_TOKEN não configurado! Webhook rejeitado por segurança.');
      return res.status(500).json({ error: 'Webhook não configurado corretamente' });
    }
    const incomingToken = req.headers['asaas-access-token'] as string;
    if (!incomingToken || incomingToken !== ASAAS_TOKEN) {
      console.warn(`Webhook Asaas: token inválido de ${req.ip}. Possível ataque!`);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // ── Validação do payload mínimo necessário ─────────────────────────────
    const { event, payment } = req.body;
    if (!event || !payment || !payment.id) {
      console.warn('Webhook Asaas: payload inválido ou incompleto', req.body);
      return res.status(400).json({ error: 'Payload inválido' });
    }

    console.log('Asaas webhook:', event, payment.id);

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

      await logAudit(db, 'PAYMENT_ASAAS_CONFIRMED', batchData.user_id, {
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
app.post('/api/create-asaas-payment', express.json(), paymentLimiter, checkRiskLocked, async (req, res) => {
  try {
    const userId = (req as any).user.uid;
    const { creditAmount, exchangeId, billingType, cpf } = req.body;
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
app.post('/api/create-gold-payment', express.json(), paymentLimiter, checkRiskLocked, async (req, res) => {
  try {
    const userId = (req as any).user.uid;
    const { weekId, billingType = 'PIX', cpf } = req.body;
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
app.post('/api/activate-gold-mode', express.json(), async (req, res) => {
  try {
    const userId = (req as any).user.uid;
    const { weekId, paymentId } = req.body;
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

    await logAudit(db, 'GOLD_MODE_ACTIVATED', userId, { week_id: weekId, payment_id: paymentId, expires_at: goldExpires });
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
    const userId = String(req.params.userId);

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

app.use('/api', createUserRouter(db, checkRiskLocked));

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Audit Log Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

// logAudit em services/audit

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ UtilitÃƒÂ¡rios Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

// referral/stats em services/*

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ InicializaÃƒÂ§ÃƒÂ£o Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

// Auto-cancelamento de trocas pendentes (chamado pela tarefa agendada)
// Cancela trocas com status 'PENDING' ou 'CONFIRMED' criadas ha mais de 48h
// Rota protegida por token interno (CRON_SECRET no env)
app.post('/api/cancel-stale-exchanges', express.json(), async (req, res) => {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return res.status(500).json({ error: 'CRON_SECRET nao configurado no servidor' });
    }
    const incomingSecret = req.headers['x-cron-secret'] as string;
    if (incomingSecret !== cronSecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 48); // 48 horas atras
    const cutoffTs = admin.firestore.Timestamp.fromDate(cutoff);

    const staleQuery = await db.collection('exchanges')
      .where('exchange_status', 'in', ['PENDING', 'CONFIRMED'])
      .where('created_at', '<=', cutoffTs)
      .limit(50)
      .get();

    if (staleQuery.empty) {
      return res.json({ cancelled: 0, message: 'Nenhuma troca vencida encontrada' });
    }

    let cancelled = 0;
    const batch = db.batch();

    for (const doc of staleQuery.docs) {
      const data = doc.data();
      const differential = (data.owner_points || 0) - (data.req_points || 0);
      
      batch.update(doc.ref, {
        exchange_status: 'CANCELLED',
        cancel_reason: 'timeout_48h',
        cancelled_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      // Restaurar semana solicitada para 'available'
      if (data.requested_week_id) {
        const weekRef = db.collection('weeks').doc(data.requested_week_id);
        batch.update(weekRef, { status: 'available' });
      }
      // Restaurar pontos se houver diferencial
      if (differential > 0) {
        const requesterRef = db.collection('users').doc(data.requester_id);
        batch.update(requesterRef, {
          credits_balance: admin.firestore.FieldValue.increment(differential),
        });
      }
      cancelled++;
    }

    await batch.commit();

    await logAudit(db, 'AUTO_CANCEL_STALE_EXCHANGES', 'system', {
      cancelled_count: cancelled,
      cutoff_hours: 48,
    });

    console.log(`Auto-cancelamento: ${cancelled} trocas vencidas canceladas`);
    res.json({ cancelled, message: `${cancelled} trocas canceladas por timeout de 48h` });
  } catch (error: any) {
    console.error('Erro no auto-cancelamento de trocas:', error);
    res.status(500).json({ error: error.message || 'Erro ao cancelar trocas vencidas' });
  }
});


app.use('/api', createReviewRouter(db));



const checkAdmin = createAdminMiddleware(db);
app.use('/api/admin', createAdminRouter(db, checkAdmin));

app.listen(PORT, () => {
  console.log(`WeekSwap server running on port ${PORT}`);
});

export default app;
