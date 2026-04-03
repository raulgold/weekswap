import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import {
  attachAsaasPaymentId,
  confirmReservationByPayment,
  createReservation,
  getReservation,
  suggestionsFor,
} from "./server/store";

dotenv.config();

async function safeJson(response: Response, endpoint: string): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (!response.ok) {
    let errorData: unknown;
    try {
      errorData = text ? JSON.parse(text) : { message: "Unknown error" };
    } catch {
      errorData = { message: text || "Empty error response" };
    }
    throw new Error(`Asaas API Error (${response.status}) on ${endpoint}: ${JSON.stringify(errorData)}`);
  }
  return text ? (JSON.parse(text) as Record<string, unknown>) : {};
}

async function fetchWithTimeout(url: string, init: RequestInit, ms = 10000): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

const paymentRequests = new Map<string, number[]>();

function rateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = req.ip || "unknown";
  const now = Date.now();
  const windowMs = 60_000;
  const maxRequests = 5;

  const timestamps = (paymentRequests.get(ip) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= maxRequests) {
    return res.status(429).json({ success: false, error: "Muitas requisições. Aguarde 1 minuto." });
  }
  timestamps.push(now);
  paymentRequests.set(ip, timestamps);
  next();
}

function verifyAsaasWebhook(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.headers["asaas-access-token"];
  const expected = process.env.ASAAS_WEBHOOK_TOKEN;
  if (expected) {
    if (token !== expected) {
      return res.sendStatus(401);
    }
  } else if (process.env.NODE_ENV === "production") {
    console.error("ASAAS_WEBHOOK_TOKEN ausente em produção — webhook bloqueado.");
    return res.sendStatus(503);
  } else {
    console.warn("ASAAS_WEBHOOK_TOKEN ausente — aceitando webhook só em desenvolvimento.");
  }
  next();
}

function asaasWebhookHandler(req: express.Request, res: express.Response) {
  const body = req.body as {
    event?: string;
    payment?: { id?: string; externalReference?: string; status?: string };
  };

  const event = body.event || "";
  const payment = body.payment;

  if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
    const ref = payment?.externalReference;
    const payId = payment?.id;
    if (ref && payId) {
      const updated = confirmReservationByPayment(ref, payId);
      if (updated) {
        console.log("[asaas webhook] reserva confirmada:", ref, payId);
      }
    }
  }

  res.sendStatus(200);
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    next();
  });

  app.use((req, res, next) => {
    const raw = process.env.ALLOWED_ORIGIN || "http://localhost:3000";
    const allowedOrigins = raw.split(",").map((o) => o.trim()).filter(Boolean);
    const origin = req.headers.origin || "";
    if (allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Access-Control-Allow-Methods", "GET,POST");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  app.post(
    "/api/webhook/asaas",
    express.json({ limit: "128kb" }),
    verifyAsaasWebhook,
    asaasWebhookHandler
  );

  app.use(express.json({ limit: "10kb" }));

  app.get("/api/suggestions", (req, res) => {
    const resortId = req.query.resortId;
    const excludeWeekId = typeof req.query.excludeWeekId === "string" ? req.query.excludeWeekId : undefined;
    if (!resortId || typeof resortId !== "string") {
      return res.status(400).json({ error: "resortId obrigatório." });
    }
    try {
      const data = suggestionsFor(resortId, excludeWeekId);
      return res.json(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro";
      return res.status(500).json({ error: msg });
    }
  });

  app.post("/api/reservations", (req, res) => {
    const { userId, resortId, weekId, waitlistNote } = req.body as Record<string, unknown>;

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ error: "userId inválido." });
    }
    if (!resortId || typeof resortId !== "string") {
      return res.status(400).json({ error: "resortId inválido." });
    }
    const wk = weekId === null || weekId === undefined ? null : weekId;
    if (wk !== null && typeof wk !== "string") {
      return res.status(400).json({ error: "weekId inválido." });
    }
    if (waitlistNote !== undefined && typeof waitlistNote !== "string") {
      return res.status(400).json({ error: "waitlistNote inválido." });
    }

    try {
      const r = createReservation({
        userId,
        resortId,
        weekId: wk,
        waitlistNote: typeof waitlistNote === "string" ? waitlistNote : undefined,
      });
      return res.status(201).json(r);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro";
      return res.status(400).json({ error: msg });
    }
  });

  app.get("/api/reservations/:id", (req, res) => {
    const r = getReservation(req.params.id);
    if (!r) return res.status(404).json({ error: "Não encontrado." });
    return res.json(r);
  });

  app.post("/api/create-payment", rateLimit, async (req, res) => {
    const body = req.body as Record<string, unknown>;
    const {
      amount,
      description,
      customerName,
      customerEmail,
      reservationId,
      userId,
    } = body;

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ success: false, error: "Valor inválido." });
    }
    if (!customerName || typeof customerName !== "string" || customerName.trim().length < 2) {
      return res.status(400).json({ success: false, error: "Nome do cliente inválido." });
    }
    if (!customerEmail || typeof customerEmail !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      return res.status(400).json({ success: false, error: "Email inválido." });
    }
    if (!description || typeof description !== "string") {
      return res.status(400).json({ success: false, error: "Descrição obrigatória." });
    }

    let externalReference: string | undefined;
    if (reservationId !== undefined && reservationId !== null) {
      if (typeof reservationId !== "string") {
        return res.status(400).json({ success: false, error: "reservationId inválido." });
      }
      if (!userId || typeof userId !== "string") {
        return res.status(400).json({ success: false, error: "userId obrigatório com reservationId." });
      }
      const r = getReservation(reservationId);
      if (!r || r.userId !== userId) {
        return res.status(403).json({ success: false, error: "Reserva inválida." });
      }
      if (r.status !== "pending") {
        return res.status(400).json({ success: false, error: "Reserva não está aguardando pagamento." });
      }
      externalReference = reservationId;
    }

    const apiKey = process.env.ASAAS_API_KEY;

    if (!apiKey) {
      console.warn("ASAAS_API_KEY not configured, using mock response");
      return res.json({
        success: true,
        paymentUrl: "https://sandbox.asaas.com/payment/mock",
        pixCode: "00020101021226830014br.gov.bcb.pix0136...",
        qrCode: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=MOCK_PIX_CODE",
        reservationId: externalReference,
      });
    }

    try {
      const isSandbox = process.env.ASAAS_ENVIRONMENT === "sandbox";
      const baseUrl = isSandbox ? "https://sandbox.asaas.com/api/v3" : "https://www.asaas.com/api/v3";

      const customerUrl = `${baseUrl}/customers`;
      const customerResponse = await fetchWithTimeout(customerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", access_token: apiKey },
        body: JSON.stringify({ name: customerName, email: customerEmail }),
      });

      let customerId: string | null = null;
      try {
        const customerData = await safeJson(customerResponse, "/customers (POST)");
        customerId = typeof customerData.id === "string" ? customerData.id : null;
        if (!customerId) throw new Error("Asaas API: customer id missing");
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes("409") || msg.includes("400")) {
          const findUrl = `${baseUrl}/customers?email=${encodeURIComponent(customerEmail)}`;
          const findResponse = await fetchWithTimeout(findUrl, {
            method: "GET",
            headers: { access_token: apiKey },
          });
          const findData = await safeJson(findResponse, "/customers (GET)");
          const data = findData.data as Array<{ id?: string }> | undefined;
          if (data && data.length > 0 && data[0].id) {
            customerId = data[0].id;
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }

      const paymentPayload: Record<string, unknown> = {
        customer: customerId,
        billingType: "PIX",
        value: amount,
        dueDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        description,
      };
      if (externalReference) {
        paymentPayload.externalReference = externalReference;
      }

      const paymentUrl = `${baseUrl}/payments`;
      const paymentResponse = await fetchWithTimeout(paymentUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", access_token: apiKey },
        body: JSON.stringify(paymentPayload),
      });
      const paymentData = await safeJson(paymentResponse, "/payments (POST)");
      const paymentId = paymentData.id as string;

      if (externalReference) {
        attachAsaasPaymentId(externalReference, paymentId);
      }

      const pixUrl = `${baseUrl}/payments/${paymentId}/pixQrCode`;
      const pixResponse = await fetchWithTimeout(pixUrl, {
        method: "GET",
        headers: { access_token: apiKey },
      });
      const pixData = await safeJson(pixResponse, "/pixQrCode (GET)");

      const payload = pixData.payload as string;
      const encodedImage = pixData.encodedImage as string;

      res.json({
        success: true,
        paymentId,
        paymentUrl: paymentData.invoiceUrl as string | undefined,
        pixCode: payload,
        qrCode: `data:image/png;base64,${encodedImage}`,
        reservationId: externalReference,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      res.status(500).json({ success: false, error: message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => console.log(`Server running on http://localhost:${PORT}`));
}

startServer();
