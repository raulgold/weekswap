import type { Resort, Week, User } from "./types";

export const USER: User = {
  id: "u-demo",
  nome: "Raul Vasconcellos",
  email: "raulvasconcellos01@gmail.com",
  pontos: 4500,
  referralCode: "RAUL2026",
};

export const RESORTS: Resort[] = [
  {
    id: "r1",
    nome: "Enjoy Olímpia Park Resort",
    cidade: "Olímpia",
    estado: "SP",
    estrelas: 5,
    fotos: [
      "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=800&q=80",
    ],
    descricao: "O maior resort temático da América Latina.",
    comodidades: ["Parque Aquático", "Spa"],
    diariaPts: 250,
  },
  {
    id: "r2",
    nome: "Beach Park Acqua Resort",
    cidade: "Aquiraz",
    estado: "CE",
    estrelas: 5,
    fotos: [
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80",
    ],
    descricao: "Frente ao mar do Ceará.",
    comodidades: ["Praia Privativa"],
    diariaPts: 350,
  },
];

export const WEEKS: Week[] = [
  {
    id: "w1",
    resortId: "r1",
    resortNome: "Enjoy Olímpia Park Resort",
    checkIn: "2026-06-14",
    checkOut: "2026-06-21",
    pontosAtuais: 1800,
    status: "disponivel",
    descricao: "Suíte Premium",
  },
  {
    id: "w2",
    resortId: "r2",
    resortNome: "Beach Park Acqua Resort",
    checkIn: "2026-07-01",
    checkOut: "2026-07-08",
    pontosAtuais: 2400,
    status: "disponivel",
    descricao: "Bangalô família",
  },
];
