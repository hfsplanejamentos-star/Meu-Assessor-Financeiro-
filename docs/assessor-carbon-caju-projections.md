# Assessor IA — Projeções C6 Carbon e Caju (12/10/2026)

## C6 Carbon — prévia, sem lançamento real
- **Regra confirmada: fechamento dia 5 e vencimento dia 7.** As projeções exigem que o cadastro do cartão esteja coerente com ambos. Compras registradas até o dia 5 pertencem ao fechamento do próprio mês; compras após o dia 5 entram no fechamento seguinte.
- `POST /assessor/card-preview` consulta `financeState` e retorna parcelas e seus respectivos ciclos de fechamento e vencimento. **Não altera saldos, faturas ou o livro de transações.**
- Compras até o dia 5 (inclusive) entram na fatura com vencimento dia 7 do próprio mês; compras de dia 6 em diante entram no ciclo seguinte. Parcelas subsequentes avançam exatamente um ciclo por mês. Exemplo: compra 04/10/2026, 3x, vencimentos 07/10, 07/11, 07/12; compra 06/10/2026, vencimentos 07/11, 07/12, 07/01/2027.
- Divisão monetária em centavos: exemplo R$ 100,00 / 3 = R$ 33,33 + R$ 33,33 + R$ 33,34.
- A rotina retorna `carbon_closing_day_conflict` quando o cadastro diverge de fechamento dia 5 e `carbon_due_day_conflict` quando diverge de vencimento dia 7. A configuração padrão para **novos cadastros** do C6 Carbon foi atualizada, mas cartões existentes **não foram migrados nem tiveram transações antigas modificadas**. O cadastro persistido e o histórico precisam de conciliação antes da efetivação.
- Compatibilidade corrigida **na prévia**: `invoiceMonth` mantém a mesma semântica do motor legado (mês de fechamento), enquanto `dueMonth` e `dueDate` indicam quando a parcela vence. Assim não há deslocamento de faturas entre os dois cálculos.
- `GET /assessor/invoices?cardId=...&month=YYYY-MM&count=4` consulta faturas já lançadas e parcelas previstas, separando `committedCents`, `plannedCents` e `totalCents`. O pagamento efetivo da fatura não é inferido dessa soma.
- Ainda é obrigatório conciliar `status: planned`, pagamento e limite efetivamente disponível antes de permitir lançamento parcelado e publicação.

## Caju — saldo calculado a partir de valores identificados
- `GET /assessor/caju-preview?month=YYYY-MM` devolve: saldo inicial confirmado + recarga **do mês** − despesas realizadas + estornos.
- São exigidos `meta.cajuOpeningByMonth[month]` (ou `automationState.cajuMonthlyOpenings[month]`) e `automationState.cajuMonthlyTopups[month]` (ou `meta.cajuRechargeByMonth[month]`). Sem valores de origem verificável, retorna `caju_opening_or_recharge_unverified`; não mostra valor inventado.
- A rotina não soma recargas de meses anteriores e não permite duplicidade comprovada por identificador de origem.
- A tela principal `index.html` foi corrigida: o Caju não pode eliminar duas compras legítimas só por terem mesmo valor/data/descrição. As referências bancárias determinam deduplicação; registros sem ID permanecem para revisão.

## Auditoria de cadastros existentes (sem migração automática)
- `GET /assessor/carbon-audit?cardId=...`: consulta o cadastro atual e conta compras, faturas (inclusive pagas), divergências entre ciclos de fechamento, datas de vencimento e recorrências vinculadas.
- `POST /assessor/carbon-repair`: exige confirmação explícita do usuário, `baseVersion` atual, fechamento 5 e vencimento 7. **Só corrige metadados de cartão que não possua compras, faturas nem recorrências vinculadas.**
- Se houver qualquer histórico, o endpoint retorna `carbon_history_requires_reconciliation` (409) e mantém o cadastro original; não migra `invoiceMonth`, não altera parcelas e não reabre pagamentos.
- O histórico de auditoria recebe um registro somente quando a atualização segura for aplicada. Nenhuma correção foi executada contra dados reais nesta rodada.
- No chat, o usuário pode solicitar "Verificar cadastro do C6 Carbon"; verá os riscos. Quando a atualização for considerada segura, o aplicativo apresenta uma confirmação adicional antes da gravação.
- As rotas acima permanecem na branch de desenvolvimento, sem implantação verificada no Convex.

## Integração Mobile
- A janela existente de revisão do Assessor IA contém campo **Quantidade de parcelas**, exibido apenas quando o usuário seleciona C6 Carbon como cartão e método Crédito.
- O botão de conferir parcelas/vencimentos consulta a API em modo leitura, sem efetivar a compra.
- O card de saldo Caju é atualizado apenas quando o servidor confirma dados de abertura e recarga; caso contrário exibe `—`.
- Fluxo de gravação real por IA permanece exclusivo para contas correntes com validação, nunca Caju/Carbon.

## Portas de validação antes de publicar
- Conferir fechamento real cadastrado do C6 Carbon e alinhar projeções de débito, pagamento da fatura e limite do Desktop/Mobile (a semântica dos meses já foi corrigida na prévia).
- Confirmar origem do saldo anterior Caju e a recarga de cada mês, sem importar valores conflitantes.
- Executar `npm run typecheck` e `npm run test:assessor` no checkout do repositório; GitHub Actions configurado, resultados ainda não confirmados neste atendimento.
- Testar conciliação de extratos, compra com valor repetido, faturas futuras, clique único, falha de rede e sincronização de contas em dispositivo Android.
- **Não publicar ou substituir o APK estável** antes da auditoria final.
