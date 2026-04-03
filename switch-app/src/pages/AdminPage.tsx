import type { User, NavParams } from "../types";
import { C, S } from "../uiStyles";

type NavigateFn = (page: string, params?: NavParams) => void;

export function AdminPage({
  navigate,
  user,
}: {
  navigate: NavigateFn;
  user: User;
}) {
  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginTop: 0 }}>Área Administrativa</h1>
        <p style={{ color: C.muted, fontSize: 13 }}>Conta: {user.email}</p>
        <p style={{ color: C.muted }}>Área Administrativa — em construção</p>
        <button
          type="button"
          onClick={() => navigate("catalog")}
          style={{ ...S.btn, background: C.accent, color: "#fff", marginTop: 16 }}
        >
          Voltar ao catálogo
        </button>
      </div>
    </div>
  );
}
