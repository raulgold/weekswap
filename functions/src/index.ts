import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// Inicializa o Firebase Admin SDK (só executa uma vez)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Webhook do Asaas — recebe notificações de pagamento e atualiza o Firestore.
 * collection: "users" | doc ID: payment.externalReference (UID do usuário)
 * campos atualizados: status_pagamento, plano_ativo, updated_at
 */
export const asaasWebhook = onRequest(async (req, res) => {

  // 1. Aceita apenas POST
  if (req.method !== "POST") {
    console.warn(`[WEBHOOK] Método não permitido: ${req.method}`);
    res.sendStatus(405);
    return;
  }

  // 2. Valida o token de segurança
  const receivedToken = req.headers["asaas-access-token"];
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;

  if (!expectedToken) {
    console.error("[WEBHOOK] CRÍTICO: variável ASAAS_WEBHOOK_TOKEN não definida.");
    res.sendStatus(200);
    return;
  }

  if (receivedToken !== expectedToken) {
    console.warn("[WEBHOOK] Token inválido. Requisição rejeitada.", {
      tokenRecebido: receivedToken ?? "ausente",
    });
    res.sendStatus(401);
    return;
  }

  // 3. Lê e loga o corpo completo
  const body = req.body;
  console.log("[WEBHOOK] ✅ Token válido. Corpo recebido:", JSON.stringify(body, null, 2));

  const eventType: string = body?.event;
  const payment = body?.payment;

  console.log("[WEBHOOK] Tipo de evento:", eventType);
  console.log("[WEBHOOK] Dados do pagamento:", JSON.stringify(payment, null, 2));

  // 4. Processa os eventos de pagamento
  try {
    switch (eventType) {
      case "PAYMENT_CONFIRMED":
      case "PAYMENT_RECEIVED": {
        const externalReference: string | undefined = payment?.externalReference;

        if (!externalReference) {
          console.warn("[WEBHOOK] ⚠️ externalReference ausente no pagamento.", { payment });
          break;
        }

        console.log(`[WEBHOOK] Atualizando usuário. UID: ${externalReference}`);

        const userRef = db.collection("users").doc(externalReference);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
          console.error(`[WEBHOOK] ❌ Usuário não encontrado no Firestore. UID: ${externalReference}`);
          break;
        }

        await userRef.update({
          status_pagamento: "pago",
          plano_ativo: true,
          ultimo_pagamento_id: payment?.id ?? null,
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`[WEBHOOK] ✅ Usuário ${externalReference} atualizado! status_pagamento=pago, plano_ativo=true`);
        break;
      }

      default:
        console.log(`[WEBHOOK] Evento ignorado (sem ação configurada): ${eventType}`);
        break;
    }
  } catch (error) {
    console.error("[WEBHOOK] ❌ Erro ao processar evento:", error);
  }

  // 5. Sempre retorna 200 para o Asaas não reenviar
  res.sendStatus(200);
});
