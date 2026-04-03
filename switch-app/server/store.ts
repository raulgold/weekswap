import { randomUUID } from "node:crypto";
import type { Reservation, ReservationStatus, Resort, Week } from "../src/types";
import { RESORTS, WEEKS } from "../src/data";

const reservations = new Map<string, Reservation>();
/** Semanas com reserva confirmada (paga). */
const confirmedWeekIds = new Set<string>();

function nowIso() {
  return new Date().toISOString();
}

export function createReservation(input: {
  userId: string;
  resortId: string;
  weekId: string | null;
  waitlistNote?: string;
}): Reservation {
  const resortOk = RESORTS.some((r) => r.id === input.resortId);
  if (!resortOk) {
    throw new Error("Resort inválido.");
  }

  let status: ReservationStatus = "waitlist";
  let weekId: string | null = input.weekId;

  if (weekId) {
    const week = WEEKS.find((w) => w.id === weekId);
    if (!week || week.resortId !== input.resortId) {
      throw new Error("Semana inválida para este resort.");
    }
    const disponivel = week.status === "disponivel" && !confirmedWeekIds.has(weekId);
    status = disponivel ? "pending" : "waitlist";
  }

  const id = randomUUID();
  const rec: Reservation = {
    id,
    userId: input.userId,
    resortId: input.resortId,
    weekId,
    status,
    waitlistNote: input.waitlistNote,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  reservations.set(id, rec);
  return { ...rec };
}

export function getReservation(id: string): Reservation | undefined {
  const r = reservations.get(id);
  return r ? { ...r } : undefined;
}

export function attachAsaasPaymentId(reservationId: string, paymentId: string): boolean {
  const r = reservations.get(reservationId);
  if (!r || r.status !== "pending") return false;
  r.asaasPaymentId = paymentId;
  r.updatedAt = nowIso();
  return true;
}

/** Chamado pelo webhook quando o pagamento é confirmado. */
export function confirmReservationByPayment(externalReference: string, asaasPaymentId: string): Reservation | undefined {
  const r = reservations.get(externalReference);
  if (!r) {
    console.warn("[asaas webhook] reserva não encontrada:", externalReference);
    return undefined;
  }

  if (r.status === "confirmed") {
    return { ...r };
  }

  if (r.status === "waitlist") {
    console.warn("[asaas webhook] pagamento recebido para reserva em waitlist — ignorando confirmação automática");
    return { ...r };
  }

  r.status = "confirmed";
  r.asaasPaymentId = asaasPaymentId;
  r.updatedAt = nowIso();
  if (r.weekId) {
    confirmedWeekIds.add(r.weekId);
  }
  return { ...r };
}

export function suggestionsFor(resortId: string, excludeWeekId?: string): {
  sameResort: Week[];
  alternatives: { resort: Resort; week: Week }[];
} {
  const sameResort = WEEKS.filter(
    (w) =>
      w.resortId === resortId &&
      w.status === "disponivel" &&
      !confirmedWeekIds.has(w.id) &&
      w.id !== excludeWeekId
  );

  const alternatives: { resort: Resort; week: Week }[] = [];
  for (const resort of RESORTS) {
    if (resort.id === resortId) continue;
    for (const w of WEEKS) {
      if (w.resortId !== resort.id) continue;
      if (w.status !== "disponivel" || confirmedWeekIds.has(w.id)) continue;
      alternatives.push({ resort, week: w });
    }
  }

  alternatives.sort((a, b) => a.week.checkIn.localeCompare(b.week.checkIn));
  return { sameResort, alternatives: alternatives.slice(0, 12) };
}
