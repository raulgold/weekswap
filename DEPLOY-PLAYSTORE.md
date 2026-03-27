# WeekSwap — Guia de Deploy e Play Store

## PARTE 1: Deploy do Backend (Servidor Express)

O frontend é estático (Firebase Hosting), mas o servidor Express precisa de uma URL pública.
Use o **Railway** (gratuito para começar):

### 1.1 Deploy no Railway
1. Acesse https://railway.app e faça login com GitHub
2. Clique em **New Project → Deploy from GitHub repo**
3. Selecione o repositório do WeekSwap
4. Configure as variáveis de ambiente (copie do seu `.env`):
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `ASAAS_API_KEY`
   - `ASAAS_API_URL`
   - `ASAAS_WEBHOOK_TOKEN`
   - `CLIENT_URL=https://weekswap-4c7d0.web.app`
   - `PORT=3001`
5. O Railway vai gerar uma URL tipo: `https://weekswap-production.up.railway.app`
6. **Anote essa URL** — será usada no próximo passo

---

## PARTE 2: Deploy do Frontend (Firebase Hosting)

### 2.1 Atualizar a URL da API no build

No arquivo `.env`, atualize:
```
VITE_API_URL=https://SUA-URL-DO-RAILWAY.up.railway.app
```

### 2.2 Instalar Firebase CLI (se não tiver)
```bash
npm install -g firebase-tools
```

### 2.3 Login no Firebase
```bash
firebase login
```

### 2.4 Build e Deploy
```bash
cd weekswap

# Build do frontend
npm run build:client

# Deploy para Firebase Hosting
firebase deploy --only hosting
```

Após o deploy, seu app estará em:
**https://weekswap-4c7d0.web.app**

---

## PARTE 3: Gerar o APK para Play Store (Método MAIS RÁPIDO)

### Use o PWABuilder.com (sem precisar instalar nada!)

1. Acesse **https://pwabuilder.com**
2. Cole a URL: `https://weekswap-4c7d0.web.app`
3. Clique em **Start** → aguarde a análise
4. Clique em **Package for Stores → Google Play**
5. Preencha:
   - **Package ID**: `com.weekswap.app`
   - **App name**: `WeekSwap`
   - **Version**: `1`
   - **Version name**: `1.0.0`
6. Clique em **Generate** → baixe o `.zip`
7. Dentro do zip estará o **AAB** pronto para upload

---

## PARTE 4: Publicar na Google Play Store

### 4.1 Criar conta de desenvolvedor
- Acesse https://play.google.com/console
- Pague a taxa única de **US$ 25**

### 4.2 Criar o app
1. **Criar aplicativo** → WeekSwap
2. Idioma padrão: Português (Brasil)
3. Tipo: Aplicativo

### 4.3 Configurações obrigatórias
- **Política de privacidade**: Necessária (crie em termsfeed.com ou similar)
- **Classificação de conteúdo**: Preencha o questionário → Livre (Everyone)
- **Público-alvo**: Adultos (18+)
- **Categoria**: Viagens e turismo

### 4.4 Upload do AAB
- Versões → Produção → Criar nova versão
- Arraste o arquivo `.aab` gerado pelo PWABuilder
- Notas da versão: "Versão inicial do WeekSwap"

### 4.5 Presença na loja
- **Título**: WeekSwap - Troca de Semanas
- **Descrição curta**: Troque semanas de resort com outros membros
- **Descrição completa**: (descreva o app)
- **Ícone**: Use o `icon-512.png` da pasta `public/`
- **Screenshots**: Tire prints do app no celular

### 4.6 Enviar para revisão
- Revisão inicial demora **3-7 dias úteis**

---

## PARTE 5: Configurar Webhook Asaas (para receber pagamentos)

Após o Railway estar no ar:

1. Acesse o painel Asaas → Configurações → Webhooks
2. URL do webhook: `https://SUA-URL-RAILWAY.up.railway.app/api/asaas-webhook`
3. Ative os eventos: `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`
4. Copie o token de autenticação e coloque no `.env` como `ASAAS_WEBHOOK_TOKEN`

---

## Arquivos já preparados neste projeto

- ✅ `public/manifest.json` — Web App Manifest (PWA)
- ✅ `public/icon-192.png` — Ícone 192x192
- ✅ `public/icon-512.png` — Ícone 512x512
- ✅ `public/.well-known/assetlinks.json` — Verificação TWA (atualizar com fingerprint do keystore)
- ✅ `firebase.json` — Configurado para Hosting
- ✅ `.firebaserc` — Projeto Firebase vinculado
- ✅ `twa-manifest.json` — Config bubblewrap (alternativa ao PWABuilder)
- ✅ `tsconfig.server.json` — Corrigido para compilação ESM

---

## Atualizar assetlinks.json após gerar o keystore

O PWABuilder vai gerar um keystore. Após isso:

1. Execute: `keytool -list -v -keystore android.keystore -alias weekswap`
2. Copie o `SHA-256` do certificado
3. Substitua `PLACEHOLDER_SUBSTITUIR_DEPOIS_DO_KEYSTORE` no arquivo:
   `public/.well-known/assetlinks.json`
4. Faça um novo `firebase deploy --only hosting`
