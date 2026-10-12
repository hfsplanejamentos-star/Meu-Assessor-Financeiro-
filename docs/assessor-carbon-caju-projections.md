# Assessor IA — Projeções C6 Carbon e Caju (12/10/2026)

## C6 Carbon — prévia, sem lançamento real
- **Vencimento confirmado: dia 7.** Não inferir o dia de fechamento: usar exclusivamente o cadastro do cartão, e bloquear a prévia se não houver fechamento válido.
- `POST /assessor/card-preview` consulta `financeState` e retorna parcelas e seus respectivos ciclos de fechamento e vencimento. **Não altera saldos, faturas ou o livro de transações.**
- Compras após o fechamento vão para o ciclo seguinte; as parcelas subsequentes avançam exatamente um ciclo por mês.
- Divisão monetária em centavos: exemplo R$ 100,00 / 3 = R$ 33,33 + R$ 33,33 + R$ 33,34.
- A rotina retorna `carbon_due_day_conflict` se o cadastro atual informa vencimento diferente de 7. Exige correção controlada do cadastro antes de liberar efetivação.
- Compatibilidade corrigida **na prévia**: `invoiceMonth` mantém a mesma semântica do motor legado (mês de fechamento), enquanto `dueMonth` e `dueDate` indicam quando a parcela vence. Assim não há deslocamento de faturas entre os dois cálculos.
- `GET /assessor/invoices?cardId=...&month=YYYY-MM&count=4` consulta faturas já lançadas e parcelas previstas, separando `committedCents`, `plannedCents` e `totalCents`. O pagamento efetivo da fatura não é inferido dessa soma.
- Ainda é obrigatório conciliar `status: planned`, pagamento e limite efetivamente disponível antes de permitir lançamento parcelado e publicação.

## Caju — saldo calculado a partir de valores identificados
- `GET /assessor/caju-preview?month=YYYY-MM` devolve: saldo inicial confirmado + recarga **do mês** − despesas realizadas + estornos.
- São exigidos `meta.cajuOpeningByMonth[month]` (ou `automationState.cajuMonthlyOpenings[month]`) e `automationState.cajuMonthlyTopups[month]` (ou `meta.cajuRechargeByMonth[month]`). Sem valores de origem verificável, retorna `caju_opening_or_recharge_unverified`; não mostra valor inventado.
- A rotina não soma recargas de meses anteriores e não permite duplicidade comprovada por identificador de origem.
- A tela principal `index.html` foi corrigida: o Caju não pode eliminar duas compras legítimas só por terem mesmo valor/data/descrição. As referências bancárias determinam deduplicação; registros sem ID permanecem para revisão.

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
