# WeekSwap — Ponto de Retomada

**Data da pausa:** 2026-04-01

---

## ✅ O que já foi implementado (concluído)

### Frontend (`src/`)
| Arquivo | Status | O que foi feito |
|---|---|---|
| `src/App.tsx` | ✅ | Rotas `/profile` e `/admin`; estado `isAdmin` via Firestore |
| `src/components/Navbar.tsx` | ✅ | Menu mobile (hamburger); links Perfil e Admin (condicional) |
| `src/pages/Dashboard.tsx` | ✅ | Cards de ação rápida; polling PIX a cada 5s; banner de fluxo de troca |
| `src/pages/WeeksPage.tsx` | ✅ | Catálogo visual com gradientes por estado; filtros busca/temporada/estrelas; cards premium |
| `src/pages/ExchangesPage.tsx` | ✅ | Botão de avaliação (5 estrelas) após troca FINALIZED; comentário opcional |
| `src/pages/ReferralPage.tsx` | ✅ | Bug fix: link não mostrava mais `?ref=undefined` |
| `src/pages/AdminPage.tsx` | ✅ | NOVO — 4 abas: Estatísticas, Documentos pendentes, Usuários, Audit Logs |
| `src/pages/ProfilePage.tsx` | ✅ | NOVO — 4 abas: Meus Dados, Saldo & Pontos, Avaliações, Segurança |
| `src/lib/GeoContext.tsx` | ✅ | Bug fix: `permissionDenied` sempre false (faltava setter no useState) |

### Backend (`server/server.ts`)
| Feature | Status |
|---|---|
| `GET /api/user/:userId` com `verifyToken` + `checkRiskLocked` | ✅ |
| Statuses padronizados para UPPERCASE (PENDING/CONFIRMED/FINALIZED/CANCELLED) | ✅ |
| Débito atômico de pontos ao iniciar troca (FieldValue.increment) | ✅ |
| `ASAAS_WEBHOOK_TOKEN` obrigatório (retorna 500 se não configurado) | ✅ |
| Prevenção de duplicatas por `numero_certificado` | ✅ |
| `POST /api/submit-review` e `GET /api/reviews/:userId` | ✅ |
| 6 rotas admin: stats, weeks-pending-docs, verify-week, users, toggle-user-lock, audit-logs | ✅ |
| `checkAdmin` middleware com `is_admin: true` no Firestore | ✅ |
| `CRON_SECRET` obrigatório no cron de cancelamento | ✅ |

### Infraestrutura
| Arquivo | Status |
|---|---|
| `firestore.rules` | ✅ | Regras para `reviews`, `audit_logs`, `exchange_fee_payments`; admin pode atualizar semanas |
| `DEPLOY.md` | ✅ | Instruções completas de deploy (Firebase Hosting + Railway + Firestore rules) |

---

## 🔜 Próximas melhorias sugeridas (ainda não implementadas)

### Prioridade Alta
1. **Notificações em tempo real** — Badge no sino quando uma troca é proposta/aceita; usar Firestore `onSnapshot` em uma coleção `notifications/{userId}/items`
2. **Página de detalhes da semana** — `/weeks/:id` com galeria de fotos, mapa, avaliações do resort, botão "Propor Troca"
3. **Fluxo completo de troca** — Tela de negociação onde ambas as partes veem a proposta e aceitam/recusam (hoje o fluxo é simplificado)

### Prioridade Média
4. **Upload de fotos da semana** — Campo adicional no formulário de publicação; exibir na WeeksPage
5. **Histórico de trocas do parceiro** — Ver avaliações de quem está oferecendo a semana antes de aceitar
6. **Filtro por país/continente** — WeeksPage atualmente filtra só por temporada e estrelas; adicionar filtro geográfico
7. **Email transacional** — Enviar email (via SendGrid ou Resend) quando troca é proposta, confirmada, finalizada

### Prioridade Baixa
8. **PWA / push notifications** — Service worker para notificações mesmo com app fechado
9. **Dashboard admin melhorado** — Gráficos de volume de trocas por mês; receita de Modo Ouro
10. **Exportar relatório CSV** — Admin exporta lista de usuários ou trocas

---

## ⚠️ Problema conhecido (não bloqueante)

- **Build local impossível**: `node_modules` foi instalado no Windows, sem binários Linux para `rollup` e `esbuild`. Para fazer build, usar máquina Windows:
  ```
  npm run build:client
  firebase deploy --only hosting
  ```
  Ver instruções completas em `DEPLOY.md`

---

## 🗂️ Arquivos críticos para referência

- Lógica de pontos: `src/lib/api.ts` e `server/server.ts` (buscar `POINTS_PER_REAL`)
- Tipos TypeScript: `src/types/index.ts`
- Configuração Firebase: `src/lib/firebase.ts`
- Variáveis de ambiente backend: `.env` (Railway) — `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `CRON_SECRET`, `FIREBASE_SERVICE_ACCOUNT_JSON`
- Regra crítica de edição: **NUNCA usar `edit_block` para substituições > 30 linhas** (trunca arquivo no Windows mount). Usar Python `write` para arquivos grandes.
