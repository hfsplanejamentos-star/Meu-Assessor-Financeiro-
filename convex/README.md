# Backend seguro · Passo 2

O backend recebe a fila criptografada do módulo Android por HTTPS, valida a origem, elimina duplicidades e classifica cada movimentação.

## Rotas

- `POST /notifications/ingest`: recebe de 1 a 50 notificações.
- `GET /notifications/changes?since=<epoch-ms>&limit=50`: entrega mudanças para o dashboard.
- As duas rotas exigem `X-Sync-Key` com pelo menos 32 caracteres.

A chave original não é gravada nas tabelas de notificações. O servidor deriva um identificador SHA-256 isolado para cada usuário.

## Variáveis do deployment

- `OPENAI_API_KEY`: habilita a classificação por IA dos casos não resolvidos pelas regras locais.
- `OPENAI_CLASSIFICATION_MODEL`: opcional; padrão `gpt-5-mini`.
- `ALLOWED_WEB_ORIGIN`: opcional; padrão `https://hfsplanejamentos-star.github.io`.

Sem `OPENAI_API_KEY`, o backend permanece operacional: casos conhecidos são classificados por regras e casos incertos ficam como `needs_review`.

## Validação

```bash
npm install
npm run typecheck
npm run test:backend
```

Para ativar em um deployment Convex autorizado:

```bash
npx convex env set OPENAI_API_KEY '<chave-servidor>'
npx convex deploy
```

Nunca coloque a chave da OpenAI no aplicativo Android, HTML, repositório ou `localStorage`.
