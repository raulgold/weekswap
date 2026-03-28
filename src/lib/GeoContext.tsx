import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// ─── Tipos ──────────────────────────────────────────────────────────────────
export type UserCountry = 'BR' | 'INTERNATIONAL';

interface GeoContextType {
  country: UserCountry;
  loading: boolean;
  permissionDenied: boolean;
  /** Pontos cobrados na finalizacao da troca (separado do diferencial) */
  EXCHANGE_FEE_PTS: number;
  /** Label da taxa para exibicao ("R$100" ou "USD 50") */
  EXCHANGE_FEE_LABEL: string;
}

// ─── Bounding box do Brasil ──────────────────────────────────────────────────
//  Norte:  5.3° N  | Sul:  -33.8° S
//  Leste: -34.8° W | Oeste: -73.9° W
function isInBrazil(lat: number, lng: number): boolean {
  return lat >= -33.8 && lat <= 5.3 && lng >= -73.9 && lng <= -34.8;
}

// ─── Taxas por regiao ────────────────────────────────────────────────────────
export const GEO_FEES: Record<UserCountry, { pts: number; label: string }> = {
  BR:            { pts: 10000,  label: 'R$100'  },   // R$100   = 10.000 pts
  INTERNATIONAL: { pts: 25500,  label: 'USD 50' },   // USD 50  = R$255 = 25.500 pts
};

// ─── Context ─────────────────────────────────────────────────────────────────
const GeoContext = createContext<GeoContextType>({
  country: 'BR',
  loading: true,
  permissionDenied: false,
  EXCHANGE_FEE_PTS: GEO_FEES.BR.pts,
  EXCHANGE_FEE_LABEL: GEO_FEES.BR.label,
});

// ─── Provider ─────────────────────────────────────────────────────────────────
export function GeoProvider({ children }: { children: ReactNode }) {
  const [country, setCountry] = useState<UserCountry>('BR');
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    // Tentar usar o cache do localStorage primeiro
    const saved = localStorage.getItem('ws_country') as UserCountry | null;

    if (!navigator.geolocation) {
      // Navegador sem suporte — usar cache ou default BR
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
      (_err) => {
        if (saved) {
          // Permissao negada mas ha cache — usa o cache sem bloquear
          setCountry(saved);
          setLoading(false);
        } else {
          // Nenhum cache — bloquear e pedir permissao
          setPermissionDenied(true);
          setLoading(false);
        }
      },
      { timeout: 12000, enableHighAccuracy: false, maximumAge: 3600000 }
    );
  }, []);

  const { pts, label } = GEO_FEES[country];

  return (
    <GeoContext.Provider value={{
      country,
      loading,
      permissionDenied,
      EXCHANGE_FEE_PTS: pts,
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
