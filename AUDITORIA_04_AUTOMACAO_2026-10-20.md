# Auditoria 04 — Regras automáticas (20/10/2026)

## Resultado verificável
O módulo isolado snake_rev0_regras_automaticas.js foi executado via Node.js com snake_rev0_teste_regras.js: **13 de 13 testes unitários passaram**. Este resultado **não** comprova integração com o Android, recebimento de notificações ou atualização do ledger.

## Cenários executados
1. Estacionamento terça de manhã — auto
2. Estacionamento quarta — auto
3. Estacionamento quinta — auto
4. Segunda fora da regra — review
5. Terça à noite fora da regra — review
6. R$ 6 sem estabelecimento — review
7. Refeição Caju no almoço — auto
8. Refeição Caju sem modalidade — review
9. Combustível Caju Trabalho — auto
10. Combustível Carbon Pessoal — auto
11. Evento sem origem bancária — review
12. Entrada não é despesa — review
13. captureId repetido — duplicate

## Observações de risco
- A deduplicação atual do classificador isolado verifica captureId; a integração final deve conciliar eventos de múltiplas fontes e evitar falsos positivos por mesmo valor/data.
- Os horários do módulo são hipóteses operacionais (estacionamento 06:00–12:00; refeição 11:00–15:00); **não são horários expressamente confirmados pelo usuário** e devem ser configuráveis.
- A detecção de estabelecimento por palavras-chave precisa de testes com notificações reais, inclusive nomes abreviados.
- Uma previsão de gasto não pode reduzir saldo antes da confirmação da transação.
- Regras de trabalho devem respeitar Caju Alimentação/Abastecimento e saldo reservado, sem criar créditos.
- O app original, o HTML V91 aprovado e o backup não foram alterados.

## Próximos gates
1. Teste de parser Android com payloads reais anonimizados.
2. Conciliação de notificação com ledger e extrato; idempotência e conflitos.
3. Integração isolada na variante validation2, com testes de reinicialização e permissões.
4. Atualização de cards, gráficos, agenda, projeção e alertas após lançamento.
5. Homologação final com evidência por cenário.
