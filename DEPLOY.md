# Deploy WeekSwap

## Pré-requisitos
- Node.js 18+
- Firebase CLI: `npm install -g firebase-tools`
- Login Firebase: `firebase login`

## Deploy Frontend (Firebase Hosting)
```bash
npm run build:client
firebase deploy --only hosting
```

## Deploy Backend (Railway)
O backend é deployado automaticamente pelo Railway ao fazer push no git:
```bash
git add -A
git commit -m "feat: melhorias do app"
git push origin main
```

## Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

## Deploy Completo
```bash
npm run build:client && firebase deploy --only hosting,firestore:rules
```

## Tornar usuário admin
No Firestore Console, no documento `users/{seu_uid}`, adicione o campo:
- `is_admin: true` (tipo: boolean)
