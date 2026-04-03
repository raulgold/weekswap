export interface Resort {
  id: string;
  nome: string;
  cidade: string;
  estado: string;
  estrelas: number;
  fotos: string[];
  descricao: string;
  comodidades: string[];
  diariaPts: number;
}

export interface Week {
  id: string;
  resortId: string;
  resortNome: string;
  checkIn: string;
  checkOut: string;
  pontosAtuais: number;
  status: "disponivel" | "reservado" | "manutencao";
  descricao: string;
}

export interface User {
  id: string;
  nome: string;
  email: string;
  pontos: number;
  referralCode: string;
}

export interface NavParams {
  resort?: Resort;
  week?: Week;
}

/** Reserva / lista de espera — persistência MVP no servidor (memória). */
export type ReservationStatus = "pending" | "confirmed" | "waitlist";

export interface Reservation {
  id: string;
  userId: string;
  resortId: string;
  weekId: string | null;
  status: ReservationStatus;
  asaasPaymentId?: string;
  waitlistNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SuggestionsResponse {
  sameResort: Week[];
  alternatives: { resort: Resort; week: Week }[];
}
