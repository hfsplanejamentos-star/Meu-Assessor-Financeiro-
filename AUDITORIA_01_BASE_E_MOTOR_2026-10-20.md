# Auditoria 01 — Base e motor financeiro — 20/10/2026

## Escopo e método
Inspeção estática do HTML aprovado e do backup de 19/10/2026. **Não foram realizados testes de execução Android ou conciliação bancária externa**. Não altera saldos, transações ou APK.

## Evidências
- Base visual aprovada: Snake_Finance_Oficial_Rev_0_BASE_APROVADA.html, 358271 bytes, SHA-256 1cc415a7edaaf573f2fcbad9e03d13b9f7ac9145f4b8f9af705028ee1402b2bf.
- Texto “Despesas Prev. + Fatura” presente na base aprovada.
- Backup de 19/10/2026, criado em 2026-10-19T20:22:32.386Z, contém 156 entradas no ledger e 29 chaves de storage.
- Tipos no ledger: 139 despesas (d), 15 receitas (r), 2 transferências (t). Contas: C6 97, Caju 42, Carbon 15, XP 2.
- Nenhum ID repetido no ledger (156 IDs únicos).
- Chaves assessor_tx e assessor_tx_v43 existem, cada uma com 156 registros; precisam ser comparadas semanticamente no mecanismo de restauração para não duplicar.
- assessor_alert_rules_v81 contém configurações para shortfall (7 dias), Carbon (limite 2500, 70%/90%), Caju, recorrências e saldo baixo. Configuração persistida **não prova entrega de notificação Android**.
- assessor_integrity_status reporta 7/7 verificações em 17/10/2026, limitadas ao mês e categorias analisadas naquele teste histórico; **não representa homologação integral da Rev. 0**.
- Regra de receita prevista salário/13º por janela de datas ainda não foi validada na execução do motor.

## Status
- Integridade estrutural do backup: INSPECIONADO (não homologado).
- IDs únicos no ledger: VERIFICADO para o backup 19/10.
- Regras salário/13º novembro e dezembro: PENDENTE de implementação/teste.
- Consolidado C6+XP: PENDENTE de teste com cenário.
- Recorrências, parcelas, Caju e fatura Carbon: PENDENTE de conciliação funcional.
- Captura e deduplicação de notificações: PENDENTE de teste Android.
- Alertas inteligentes: PENDENTE de teste Android.
- HTML V91 aprovado no asset da branch: PENDENTE de integração.
- APK validation2: PENDENTE de compilação/teste.

## Critério de avanço
Executar cenários reproduzíveis com cópia isolada dos dados e registrar esperado/observado. Não aprovar cálculo apenas por existência de funções ou configuração.
