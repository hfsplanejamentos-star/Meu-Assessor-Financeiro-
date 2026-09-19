# Meu Assessor Financeiro — V10

Release candidata consolidada na branch `v10-consolidacao`, com gate executável **50/50** e Desktop/Mobile compartilhando o mesmo Store e FinanceEngine.

## Validação

```bash
node tools/build-v10.cjs
node tests/v10-core.cjs
node --check v10/app.bundle.js
```

Para o E2E, sirva a raiz por HTTP e informe a URL em `V10_URL` ao executar `tests/v10-e2e.cjs`.

## Produção e rollback

Promova somente o commit aprovado da branch `v10-consolidacao`. Antes da promoção, configure `OPENAI_API_KEY` no backend Convex e valide o endpoint HTTPS. O rollback da versão anterior é o commit `41e4dcbcd39b11cb370815f86b9805775f691955`; preserve-o durante a estabilização.

Veja [o relatório de validação V10](v10/RELATORIO-VALIDACAO-50-50.md).
