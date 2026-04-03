export const POINTS_PER_REAL = 100; // R$1 = 100 pontos (estilo RCI)
export const GOLD_MODE_PRICE = 200; // R$200 para Modo Ouro
export const GOLD_MODE_DAYS = 30; // Modo Ouro valido por 30 dias

export function calcularPontosSemana(data: {
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
  const t = (data.temporada || '').toLowerCase().replace(/\s+/g, '');
  const base = t.startsWith('alt') ? 150000 : t.startsWith('bai') ? 60000 : 100000;

  const tipo = (data.tipo_unidade || '').toLowerCase();
  let tipoMult = 1.0;
  if (/studio|flat|kitnet/.test(tipo)) tipoMult = 0.85;
  else if (/3\s*q|tres|tr[ei]s/.test(tipo)) tipoMult = 1.5;
  else if (/2\s*q|dois|duas/.test(tipo)) tipoMult = 1.25;

  const cap = Number(data.capacidade) || 2;
  const capMult = cap >= 8 ? 1.35 : cap >= 6 ? 1.2 : cap >= 4 ? 1.1 : 1.0;

  const estadoMults: Record<string, number> = {
    SC: 1.3,
    RJ: 1.3,
    PE: 1.25,
    BA: 1.2,
    CE: 1.15,
    SP: 1.1,
    ES: 1.05,
  };
  const estadoMult = estadoMults[(data.estado || '').toUpperCase().trim()] || 1.0;

  const estrelas = Math.min(5, Math.max(1, Math.round(Number(data.estrelas) || 3)));
  const estrelasMults: Record<number, number> = { 5: 1.4, 4: 1.2, 3: 1.0, 2: 0.8, 1: 0.6 };
  const estrelasMult = estrelasMults[estrelas] ?? 1.0;

  const av = Math.min(5, Math.max(0, Number(data.avaliacao) || 3));
  const avaliacaoMult =
    av >= 4.5 ? 1.2 : av >= 4.0 ? 1.1 : av >= 3.0 ? 1.0 : av >= 2.0 ? 0.9 : 0.8;

  const dias = Math.max(
    1,
    Math.round((new Date(data.check_out).getTime() - new Date(data.check_in).getTime()) / 86400000)
  );
  const duracaoMult = dias >= 14 ? 1.3 : dias >= 7 ? 1.0 : dias >= 5 ? 0.9 : 0.7;

  const docsMult = data.docs_verified ? 1.1 : 1.0;

  const raw =
    base * tipoMult * capMult * estadoMult * estrelasMult * avaliacaoMult * duracaoMult * docsMult;
  return Math.round(raw / 1000) * 1000;
}

export function labelPontosSemana(pontos: number): string {
  if (pontos >= 200000) return 'Premium';
  if (pontos >= 140000) return 'Luxo';
  if (pontos >= 100000) return 'Superior';
  if (pontos >= 70000) return 'Standard';
  return 'Economica';
}

