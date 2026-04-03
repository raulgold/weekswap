import { MapPin } from "lucide-react";
import type { User, Resort, NavParams } from "../types";
import { RESORTS } from "../data";
import { C, S } from "../uiStyles";
import { StarRating } from "../components/ui";

type NavigateFn = (page: string, params?: NavParams) => void;

export function CatalogPage({
  navigate,
  user,
}: {
  navigate: NavigateFn;
  user: User;
}) {
  return (
    <div style={S.wrap}>
      <div style={{ ...S.flex, marginBottom: 24, justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Catálogo</h1>
          <p style={{ color: C.muted, margin: "8px 0 0" }}>
            Olá, {user.nome} — {user.pontos.toLocaleString("pt-BR")} pts
          </p>
        </div>
      </div>
      <div style={S.grid2}>
        {RESORTS.map((resort: Resort) => (
          <button
            key={resort.id}
            type="button"
            onClick={() => navigate("detail", { resort })}
            style={{
              ...S.card,
              padding: 0,
              overflow: "hidden",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            {resort.fotos?.length ? (
              <img
                src={resort.fotos[0]}
                alt=""
                style={{ width: "100%", height: 200, objectFit: "cover" }}
              />
            ) : null}
            <div style={{ padding: 20 }}>
              <div style={{ ...S.flex, marginBottom: 8 }}>
                <StarRating n={resort.estrelas} />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 8px" }}>{resort.nome}</h2>
              <div style={{ ...S.flex, color: C.muted, fontSize: 14 }}>
                <MapPin size={16} />
                {resort.cidade}, {resort.estado}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
