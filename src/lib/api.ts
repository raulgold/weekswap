import { auth } from './firebase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch {
    // Continue sem token
  }
  return headers;
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: { ...authHeaders, ...(options?.headers || {}) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro na requisicao');
  return data;
}

export const api = {
  // Semanas
  getWeeks: () => request<{ weeks: any[] }>('/api/weeks'),

  submitWeek: (userId: string, weekData: any) =>
    request<{ success: boolean; weekId: string }>('/api/submit-week', {
      method: 'POST',
      body: JSON.stringify({ userId, weekData }),
    }),

  // Trocas
  getExchanges: (userId: string) =>
    request<{ exchanges: any[] }>(`/api/exchanges/${userId}`),

  initiateExchange: (userId: string, offeredWeekId: string, requestedWeekId: string) =>
    request<{
      success: boolean;
      exchangeId: string;
      differential: number;  // pts que o solicitante precisou cobrir (>0 = cobriu do saldo)
      feeBRL: number;        // R$100
      feeINT: number;        // R$255
    }>('/api/initiate-exchange', {
      method: 'POST',
      body: JSON.stringify({ userId, offeredWeekId, requestedWeekId }),
    }),

  completeExchange: (userId: string, exchangeId: string, country: string = 'BR') =>
    request<{ success: boolean; data: any }>('/api/complete-exchange', {
      method: 'POST',
      body: JSON.stringify({ userId, exchangeId, country }),
    }),

  createExchangeFeePayment: (userId: string, exchangeId: string, billingType: string, country: string, cpf?: string) =>
    request<any>('/api/create-exchange-fee-payment', {
      method: 'POST',
      body: JSON.stringify({ userId, exchangeId, billingType, country, cpf }),
    }),

  confirmExchange: (userId: string, exchangeId: string) =>
    request<{ success: boolean }>('/api/confirm-exchange', {
      method: 'POST',
      body: JSON.stringify({ userId, exchangeId }),
    }),

  cancelExchange: (userId: string, exchangeId: string) =>
    request<{ success: boolean }>('/api/cancel-exchange', {
      method: 'POST',
      body: JSON.stringify({ userId, exchangeId }),
    }),

  // Asaas — pontos (R$1 = 100 pontos)
  createAsaasPayment: (userId: string, creditAmount: number, billingType: string, cpf?: string, exchangeId?: string) =>
    request<any>('/api/create-asaas-payment', {
      method: 'POST',
      body: JSON.stringify({ userId, creditAmount, billingType, cpf, exchangeId }),
    }),

  getAsaasPaymentStatus: (paymentId: string) =>
    request<{ status: string; value: number }>(`/api/asaas-payment/${paymentId}`),

  // Modo Ouro
  createGoldPayment: (userId: string, weekId: string, billingType: string, cpf?: string) =>
    request<any>('/api/create-gold-payment', {
      method: 'POST',
      body: JSON.stringify({ userId, weekId, billingType, cpf }),
    }),

  activateGoldMode: (userId: string, weekId: string, paymentId: string) =>
    request<any>('/api/activate-gold-mode', {
      method: 'POST',
      body: JSON.stringify({ userId, weekId, paymentId }),
    }),

  getGoldPaymentStatus: (paymentId: string) =>
    request<{ status: string; value: number }>(`/api/gold-payment-status/${paymentId}`),

  // Usuario
  getUser: (userId: string) => request<any>(`/api/user/${userId}`),
};
