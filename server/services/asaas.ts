type AsaasRequest = (path: string, method: string, body?: any) => Promise<any>;

export function createAsaasRequest(): AsaasRequest {
  const ASAAS_API_KEY = process.env.ASAAS_API_KEY!;
  const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://api.asaas.com/v3';

  return async function asaasRequest(path: string, method: string, body?: any): Promise<any> {
    const res = await fetch(`${ASAAS_API_URL}${path}`, {
      method,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        access_token: ASAAS_API_KEY,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  };
}

