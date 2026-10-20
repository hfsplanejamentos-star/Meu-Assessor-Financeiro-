# Auditoria 11 — Agenda, recorrências e alertas (20/10/2026)

## Método
Inspeção estática do HTML isolado Auditoria 09. Testes funcionais permanecem para a fase final, conforme solicitação do usuário. Não modificar app original nem dados.

## Achados
1. **Efetivação:** a função openEfet(id) oferece valor, data de pagamento e conta, chamando confirmEfet(id). Conferir em teste final a persistência, atualização de saldos e status verde.
2. **Recorrências:** ensureRecurrences(ym) somente gera recorrências automaticamente para meses de **2027-01 até 2036-12**. Portanto, essa rotina não cobre a criação automática de novembro/dezembro de 2026. Não alterar essa janela sem verificar migração e dados reais.
3. **Agenda:** existem referências de navegação para agenda e consultas por dia. Conferir vínculo entre o mesmo lançamento e todos os painéis, sem cópias independentes.
4. **Alertas Android:** syncNativeFinancialAlerts() solicita showFinancialAlert somente quando o mês visualizado coincide com o atual e a severidade é critical; marca como enviado apenas quando o bridge retorna true. A função é chamada em draw(), logo o trecho inspecionado **não comprova disparo com aplicativo fechado**.
5. **Auditoria interna:** auditEngine() verifica estrutura, saldos C6/XP, consolidado, projeção e transferências; isso não equivale a testes independentes de todas as regras.
6. **Edição:** saveLanc(id) atualiza campos e chama persistLedger(); há necessidade de validar propagação para recorrências, faturas e gráficos, sem criar registros duplicados.

## Pendências antes da fase final
- Rever geração de recorrências de 2026 e competência de lançamentos.
- Garantir que a efetivação altere um único registro e todos os painéis reflitam o mesmo estado.
- Especificar disparos de alertas em background Android; inspeção da função HTML não comprova entrega.
- Conciliar regra de salário/13º com receitas já realizadas.
- Integrar o classificador isolado no Android de validação e preservar original.

## Status
**INSPECIONADO, NÃO HOMOLOGADO.** Nenhum item do checklist deve ser marcado aprovado apenas por esta inspeção.
