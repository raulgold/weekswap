import { useState, useEffect, type FormEvent } from "react";
import { X, CheckCircle2, BellRing } from "lucide-react";
import type { Resort, User, NavParams, Week, SuggestionsResponse } from "./types";
import { USER, WEEKS } from "./data";
import { C, S } from "./uiStyles";
import { CatalogPage } from "./pages/CatalogPage";
import { AdminPage } from "./pages/AdminPage";
const fmtData = (s: string) => {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
};

function WaitlistModal({
  onClose,
  resort,
  user,
}: {
  onClose: () => void;
  resort: Resort;
  user: User;
}) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [contact, setContact] = useState(user.email);
  const [method, setMethod] = useState<"email" | "whatsapp">("email");
  const [desiredDate, setDesiredDate] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setSubmitError(null);
    try {
      const waitlistNote = `${desiredDate} | ${method} | ${contact}`;
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          resortId: resort.id,
          weekId: null,
          waitlistNote,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Não foi possível entrar na lista de espera.");
      }
      setSuccess(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Erro ao registrar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
        backdropFilter: "blur(4px)",
      }}
    >
      <div style={{ ...S.card, maxWidth: 440, width: "100%", position: "relative" }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          <X size={24} />
        </button>
        {!success ? (
          <>
            <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Me avise quando chegar! 🔔</h3>
            <p style={{ color: C.muted, fontSize: 14, marginBottom: 24 }}>
              Deixe seu contato para o <strong>{resort.nome}</strong>.
            </p>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Qual período você procura?</div>
                <input
                  type="text"
                  required
                  placeholder="ex: Julho de 2024"
                  value={desiredDate}
                  onChange={(e) => setDesiredDate(e.target.value)}
                  style={{ ...S.input, marginBottom: 16 }}
                />
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Como deseja ser avisado?</div>
                <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setMethod("email");
                      setContact("");
                    }}
                    style={{
                      ...S.btn,
                      flex: 1,
                      background: method === "email" ? C.accent + "15" : C.card2,
                      color: method === "email" ? C.accent : C.muted,
                    }}
                  >
                    Email
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMethod("whatsapp");
                      setContact("");
                    }}
                    style={{
                      ...S.btn,
                      flex: 1,
                      background: method === "whatsapp" ? C.accent + "15" : C.card2,
                      color: method === "whatsapp" ? C.accent : C.muted,
                    }}
                  >
                    WhatsApp
                  </button>
                </div>
                <input
                  type={method === "email" ? "email" : "tel"}
                  required
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  style={S.input}
                />
              </div>
              {submitError && (
                <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{submitError}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                style={{ ...S.btn, width: "100%", background: C.accent, color: "#fff" }}
              >
                {loading ? "Agendando..." : "Me avisar"}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: "center" }}>
            <CheckCircle2 size={48} color={C.green} style={{ marginBottom: 16 }} />
            <h3 style={{ fontSize: 22, fontWeight: 800 }}>Tudo pronto!</h3>
            <p style={{ color: C.muted }}>
              Avisaremos sobre <strong>{desiredDate}</strong> via {method}.
            </p>
            <button
              type="button"
              onClick={onClose}
              style={{ ...S.btn, width: "100%", background: C.accent, color: "#fff", marginTop: 20 }}
            >
              Entendido
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailPage({
  navigate,
  params,
  user,
}: {
  navigate: (p: string, ps?: NavParams) => void;
  params: NavParams;
  user: User;
}) {
  const resort = params?.resort;
  const [waitlistModal, setWaitlistModal] = useState(false);
  const [alternatives, setAlternatives] = useState<SuggestionsResponse | null>(null);
  const [reservaBusyId, setReservaBusyId] = useState<string | null>(null);
  const [reservaMessage, setReservaMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!resort?.id) return;
    let cancel = false;
    const ex = params.week?.id;
    const q = new URLSearchParams({ resortId: resort.id });
    if (ex) q.set("excludeWeekId", ex);
    fetch(`/api/suggestions?${q.toString()}`)
      .then((r) => r.json())
      .then((data: SuggestionsResponse) => {
        if (!cancel) setAlternatives(data);
      })
      .catch(() => {
        if (!cancel) setAlternatives({ sameResort: [], alternatives: [] });
      });
    return () => {
      cancel = true;
    };
  }, [resort?.id, params.week?.id]);

  if (!resort) {
    return (
      <div style={S.wrap}>
        <p>Resort não encontrado.</p>
        <button type="button" onClick={() => navigate("catalog")} style={S.btn}>
          ← Voltar
        </button>
      </div>
    );
  }

  const semanas = WEEKS.filter((w) => w.resortId === resort.id);

  async function handleReservarSemana(w: Week) {
    if (!resort) return;
    setReservaMessage(null);
    setReservaBusyId(w.id);
    try {
      const r1 = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          resortId: resort.id,
          weekId: w.id,
        }),
      });
      const resv = (await r1.json()) as { id?: string; error?: string };
      if (!r1.ok) {
        throw new Error(resv.error || "Não foi possível criar a reserva.");
      }
      const amount = Math.max(1, Math.round((w.pontosAtuais / 100) * 100) / 100);
      const r2 = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          description: `SWITCH — ${resort.nome} — ${w.descricao}`,
          customerName: user.nome,
          customerEmail: user.email,
          reservationId: resv.id,
          userId: user.id,
        }),
      });
      const pay = (await r2.json()) as {
        success?: boolean;
        error?: string;
        paymentUrl?: string;
        reservationId?: string;
      };
      if (!r2.ok || !pay.success) {
        throw new Error(pay.error || "Falha ao gerar pagamento.");
      }
      setReservaMessage(
        pay.paymentUrl
          ? `Reserva ${pay.reservationId || resv.id} pendente. Abra o link de pagamento.`
          : `Reserva ${pay.reservationId || resv.id} — pagamento em análise.`
      );
      if (pay.paymentUrl) {
        window.open(pay.paymentUrl, "_blank", "noopener,noreferrer");
      }
    } catch (e) {
      setReservaMessage(e instanceof Error ? e.message : "Erro na reserva.");
    } finally {
      setReservaBusyId(null);
    }
  }

  return (
    <div style={S.wrap}>
      <button
        type="button"
        onClick={() => navigate("catalog")}
        style={{
          ...S.btn,
          background: "#fff",
          color: C.muted,
          border: `1px solid ${C.border}`,
          marginBottom: 24,
        }}
      >
        ← Voltar
      </button>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 32 }}>
        <div style={S.col}>
          <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
            {resort.fotos && resort.fotos.length > 0 && (
              <img
                src={resort.fotos[0]}
                alt=""
                style={{ width: "100%", height: 400, objectFit: "cover" }}
              />
            )}
            <div style={{ padding: 32 }}>
              <h2 style={{ fontSize: 32, fontWeight: 800 }}>{resort.nome}</h2>
              <p style={{ color: C.muted }}>{resort.descricao}</p>
              <p style={{ color: C.muted, fontSize: 14 }}>
                Semanas listadas: {semanas.map((w) => `${fmtData(w.checkIn)} – ${fmtData(w.checkOut)}`).join(" · ") || "—"}
              </p>
            </div>
          </div>
        </div>
        <div style={S.col}>
          <div style={S.card}>
            <h3 style={{ marginBottom: 20 }}>Reservar</h3>
            {reservaMessage && (
              <p style={{ fontSize: 14, color: C.muted, marginBottom: 16 }}>{reservaMessage}</p>
            )}
            {semanas.length > 0 ? (
              semanas.map((w) => (
                <div
                  key={w.id}
                  style={{
                    border: `1px solid ${C.border}`,
                    padding: 16,
                    borderRadius: 12,
                    marginBottom: 12,
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{w.descricao}</div>
                  <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
                    {fmtData(w.checkIn)} — {fmtData(w.checkOut)} · {w.pontosAtuais.toLocaleString("pt-BR")} pts
                  </div>
                  <button
                    type="button"
                    disabled={reservaBusyId !== null}
                    onClick={() => handleReservarSemana(w)}
                    style={{ ...S.btn, background: C.accent, color: "#fff", width: "100%", marginTop: 10 }}
                  >
                    {reservaBusyId === w.id ? "Processando..." : "Reservar"}
                  </button>
                </div>
              ))
            ) : (
              <div style={{ textAlign: "center", padding: 20, background: C.card2, borderRadius: 12 }}>
                <BellRing size={32} color={C.muted} />
                <p>Nenhuma semana disponível.</p>
                <button
                  type="button"
                  onClick={() => setWaitlistModal(true)}
                  style={{ ...S.btn, background: C.accent, color: "#fff" }}
                >
                  Me avise quando chegar
                </button>
              </div>
            )}
          </div>
          {alternatives &&
            (alternatives.sameResort.length > 0 || alternatives.alternatives.length > 0) && (
              <div style={{ ...S.card, marginTop: 20 }}>
                <h3 style={{ marginTop: 0 }}>Alternativas sugeridas</h3>
                <p style={{ color: C.muted, fontSize: 14 }}>
                  {semanas.length === 0
                    ? "Sem vagas aqui — veja outras datas neste resort ou destinos parecidos."
                    : "Outras datas e resorts com disponibilidade."}
                </p>
                {alternatives.sameResort.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>Neste resort</div>
                    {alternatives.sameResort.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() =>
                          navigate("detail", {
                            resort,
                            week: w,
                          })
                        }
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          ...S.btn,
                          background: C.card2,
                          marginBottom: 8,
                        }}
                      >
                        {w.descricao} — {fmtData(w.checkIn)} ({w.pontosAtuais.toLocaleString("pt-BR")} pts)
                      </button>
                    ))}
                  </div>
                )}
                {alternatives.alternatives.length > 0 && (
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>Outros resorts</div>
                    {alternatives.alternatives.map(({ resort: r, week: w }) => (
                      <button
                        key={`${r.id}-${w.id}`}
                        type="button"
                        onClick={() => navigate("detail", { resort: r, week: w })}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          ...S.btn,
                          background: C.card2,
                          marginBottom: 8,
                        }}
                      >
                        <strong>{r.nome}</strong> — {w.descricao} · {fmtData(w.checkIn)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
        </div>
      </div>
      {waitlistModal && (
        <WaitlistModal onClose={() => setWaitlistModal(false)} resort={resort} user={user} />
      )}
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("catalog");
  const [params, setParams] = useState<NavParams>({});

  const navigate = (p: string, ps: NavParams = {}) => {
    setPage(p);
    setParams(ps);
  };

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <div style={{ fontWeight: 800, color: C.accent }}>SWITCH</div>
        <div style={S.flex}>
          <button type="button" onClick={() => navigate("catalog")} style={S.btn}>
            Catálogo
          </button>
          <button type="button" onClick={() => navigate("admin")} style={S.btn}>
            Admin
          </button>
        </div>
      </nav>
      {page === "catalog" && <CatalogPage navigate={navigate} user={USER} />}
      {page === "detail" && <DetailPage navigate={navigate} params={params} user={USER} />}
      {page === "admin" && <AdminPage navigate={navigate} user={USER} />}
    </div>
  );
}
