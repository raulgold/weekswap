import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// ─── Tipos ──────────────────────────────────────────────────────────────────
export type UserCountry = 'BR' | 'INTERNATIONAL';

interface GeoContextType {
  country: UserCountry;
  loading: boolean;
  permissionDenied: boolean;
  /** Valor em Reais da taxa de finalizacao de troca (R$100 BR / R$255 INT) */
  EXCHANGE_FEE_REAIS: number;
  /** Label da taxa para exibicao ("R$100" ou "USD 50 (R$255)") */
  EXCHANGE_FEE_LABEL: string;
}

// ─── Bounding box do Brasil ──────────────────────────────────────────────────
function isInBrazil(lat: number, lng: number): boolean {
  return lat >= -33.8 && lat <= 5.3 && lng >= -73.9 && lng <= -34.8;
}

// ─── Taxas por regiao (em Reais — cobradas via Asaas, nao em pontos) ─────────
export const GEO_FEES: Record<UserCountry, { reais: number; label: string }> = {
  BR:            { reais: 100,  label: 'R$100'         },  // Brasil
  INTERNATIONAL: { reais: 255,  label: 'USD 50 (R$255)' }, // Internacional: USD50 × 5.10
};

// ─── Context ─────────────────────────────────────────────────────────────────
const GeoContext = createContext<GeoContextType>({
  country: 'BR',
  loading: true,
  permissionDenied: false,
  EXCHANGE_FEE_REAIS: GEO_FEES.BR.reais,
  EXCHANGE_FEE_LABEL: GEO_FEES.BR.label,
});

// ─── Provider ─────────────────────────────────────────────────────────────────
export function GeoProvider({ children }: { children: ReactNode }) {
  const [country, setCountry] = useState<UserCountry>('BR');
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('ws_country') as UserCountry | null;

    if (!navigator.geolocation) {
      setCountry(saved ?? 'BR');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const detected: UserCountry = isInBrazil(latitude, longitude) ? 'BR' : 'INTERNATIONAL';
        setCountry(detected);
        setLoading(false);
        localStorage.setItem('ws_country', detected);
      },
      (err) => {
        // Verificar se foi negado permissão
        if (err.code === 1) { // PERMISSION_DENIED
          setPermissionDenied(true);
        }
        // Em caso de falha (timeout, recusa, erro de GPS), usar valor salvo ou BR como padrão.
        // Nunca bloquear o app — a detecção de localização é apenas para taxa de câmbio.
        setCountry(saved ?? 'BR');
        setLoading(false);
      },
      { timeout: 15000, enableHighAccuracy: false, maximumAge: 3600000 }
    );
  }, []);

  const { reais, label } = GEO_FEES[country];

  return (
    <GeoContext.Provider value={{
      country,
      loading,
      permissionDenied,
      EXCHANGE_FEE_REAIS: reais,
      EXCHANGE_FEE_LABEL: label,
    }}>
      {children}
    </GeoContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useGeo() {
  return useContext(GeoContext);
}
