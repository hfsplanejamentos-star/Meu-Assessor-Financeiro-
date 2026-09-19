# V10 — itens 11 a 15 fechados

- [x] **11 Migração segura:** migração versionada e idempotente; preserva a base V10 existente e só usa legado quando V10 não existe.
- [x] **12 Recorrências unificadas:** uma regra `recurringFor()` alimenta resumo e categorias.
- [x] **13 Previsto × realizado:** `classify()` define transfer/planned/realized/other e o resumo separa os dois regimes.
- [x] **14 Investimentos unificados:** exatamente um aporte canônico mensal de R$3.000 nov/26–jul/27, como transferência fora de despesas.
- [x] **15 Patrimônio unificado:** `balances()`, `patrimony()` e `available()` são a fonte V10; contas marcadas `excludeFromPatrimony` (Caju) ficam fora.

## Critérios
Migração não deve apagar alterações reais do usuário. Caju não compõe patrimônio. Aporte altera caixa/investimento, não patrimônio. Previsto não é contabilizado como realizado.
