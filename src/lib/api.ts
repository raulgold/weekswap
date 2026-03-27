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
    // Continue sem token — servidor usará userId do body como fallback
  }
  return headers;
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const authHeaders = await getAuthHeaders();

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...authHeaders,
      ...(options?.headers || {}),
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Erro na requisição');
  }

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
    request<{ success: boolean; exchangeId: string }>('/api/initiate-exchange', {
      method: 'POST',
      body: JSON.stringify({ userId, offeredWeekId, requestedWeekId }),
    }),

  completeExchange: (userId: string, exchangeId: string) =>
    request<{ success: boolean; data: any }>('/api/complete-exchange', {
      method: 'POST',
      body: JSON.stringify({ userId, exchangeId }),
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

  // Asaas
  createAsaasPayment: (userId: string, creditAmount: number, billingType: string, cpf?: string, exchangeId?: string) =>
    request<any>('/api/create-asaas-payment', {
      method: 'POST',
      body: JSON.stringify({ userId, creditAmount, billingType, cpf, exchangeId }),
    }),

  getAsaasPaymentStatus: (paymentId: string) =>
    request<{ status: string; value: number }>(`/api/asaas-payment/${paymentId}`),

  // Usuário
  getUser: (userId: string) => request<any>(`/api/user/${userId}`),
};
