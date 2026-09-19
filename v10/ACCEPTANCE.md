# V10 — Gate mestre dos 50 itens

Status em 19/09/2026: **50/50 OK**.

Cada item somente é aprovado quando a implementação e sua asserção em `V10MasterAcceptance.run()` passam. O resultado também é publicado no elemento `html` pelos atributos `data-v10-gate`, `data-v10-gate-status` e `data-v10-gate-failed`.

Evidências, testes e rollback: [RELATORIO-VALIDACAO-50-50.md](./RELATORIO-VALIDACAO-50-50.md).

```bash
node tools/build-v10.cjs
node tests/v10-core.cjs
node --check v10/app.bundle.js
V10_URL=http://127.0.0.1:4173/index.html node tests/v10-e2e.cjs
```
