# Regras do Projeto WeekSwap

## Idioma
- **SEMPRE responder em Português do Brasil (pt-BR)**, sem exceção.

## Projeto
- App: WeekSwap (troca de semanas de multipropriedade)
- Frontend: Firebase Hosting (weekswap-4c7d0.web.app)
- Backend: Railway (weekswap-production.up.railway.app)
- Pagamentos: Asaas
- Android APK: gerado via bubblewrap/TWA

## Stack Técnico
- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend: Express + TypeScript (tsconfig.server.json)
- Auth: Firebase Auth (email/senha + Google)
- DB: Firebase Firestore
- Storage: Firebase Storage (PDFs dos contratos)
- i18n: src/lib/i18n.ts + src/lib/LanguageContext.tsx (pt-BR / en-US)
- Moedas: BRL (padrão) e USD (R$1 = ~US$0,20 / USD_TO_BRL = 5.10)

## Regras de Edição de Arquivos (CRÍTICO — aprendido com erros reais)

### NUNCA usar edit_block para substituições > 30 linhas
- O Desktop Commander trunca silenciosamente arquivos quando o texto de substituição tem > 50 linhas
- Isso destrói o arquivo (ex: server.ts foi de 1113 → 907 linhas perdendo 206 linhas)
- **Regra**: Qualquer substituição grande → usar Python write para reescrever o arquivo completo

### Método correto para alterações grandes
```python
with open('/caminho/absoluto/arquivo.tsx', 'w', encoding='utf-8', newline='\r\n') as f:
    f.write(conteudo_completo)
```
- Sempre usar `newline='\r\n'` para arquivos no mount do Windows
- Verificar a contagem de linhas após: `f.write()` + `print(f'OK: {conteudo.count(chr(10))+1} linhas')`

### Recuperação de arquivos corrompidos
- Se server.ts for truncado: `git show HEAD:server/server.ts > /tmp/original.ts` (NÃO usar git checkout)
- O git checkout falha no Linux VM com "unable to unlink" em paths do Windows mount

### Validação TypeScript
- Frontend: `cd /caminho/projeto && npx tsc --noEmit`
- Backend:  `cd /caminho/projeto && npx tsc -p tsconfig.server.json --noEmit`
- SEMPRE rodar antes de commitar

### Vite + TypeScript
- Sempre criar `src/vite-env.d.ts` com `/// <reference types="vite/client" />` em projetos Vite
- Sem isso, `import.meta.env` causa erros TS2339

## Regras de Negócio

### Sistema de Pontos (100:1)
- R$1 = 100 pontos (estilo RCI)
- `POINTS_PER_REAL = 100` no frontend e backend
- Armazenar: `credit_batches.amount` = pontos, `amount_reais` = valor em R$

### Modo Ouro
- Preço: R$200 | Duração: 30 dias
- Semanas gold aparecem sempre no TOPO das listagens
- Coleção Firestore: `gold_payments`
- Campos na semana: `gold_mode: bool`, `gold_expires_at: Timestamp`

### Documentos Obrigatórios
- Upload via Firebase Storage (client-side): `weeks/{userId}/{timestamp}_contrato.pdf`
- Apenas PDF, máx 5 MB por arquivo
- Dois arquivos: contrato da cota + comprovante do resort ativo
- Aceite da carta de autorização digital antes de publicar

### Asaas Webhook
- URL: POST /api/asaas-webhook
- Evento PAYMENT_RECEIVED/CONFIRMED → ativa créditos ou Modo Ouro automaticamente
