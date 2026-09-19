# V10 — itens 2, 4 e 7

- [x] **2 Modularização:** Store e motor financeiro extraídos para módulos V10 próprios; index apenas carrega os módulos. A migração restante de UI é tratada nos itens específicos de interface, não neste item.
- [x] **4 FinanceEngine único:** cálculos V10 centralizados em `v10/finance-engine.js`; Store é a única fonte de estado para o motor V10.
- [x] **7 Remover dados fictícios da produção:** novo armazenamento `meu_assessor_financeiro_v10_real`, schema 2, `environment=production`, `dataMode=real`; migração limpa contas Nubank/BTG e registros marcados demo/fictício/simulação.

## Dados reais preservados
A migração é não destrutiva: lê a base anterior uma única vez quando a chave V10 ainda não existe e grava uma cópia saneada. Também consolida os lançamentos reais mais recentes (rescisão e Caju) por IDs idempotentes.
