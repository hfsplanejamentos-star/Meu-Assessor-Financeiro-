/**
 * READ-ONLY projections for C6 Carbon invoice cycles and Caju benefits.
 * Do not write or implicitly reconcile the canonical ledger.
 */
type Item = Record<string, any>;
type State = Record<string, any>;
export type CarbonPreviewRequest={cardId:string;purchaseDate:string;totalCents:number;installments:number};
export const CARBON_CLOSING_DAY=5;
export const CARBON_DUE_DAY=7;
const finiteCents=(n:unknown):number|null=>{
 if(typeof n!=="number"||!Number.isFinite(n))return null;
 const cents=Math.round(n*100);
 return Number.isSafeInteger(cents)&&Math.abs(n*100-cents)<0.00001?cents:null;
};
const ym=(year:number,monthZero:number)=>String(year)+"-"+String(monthZero+1).padStart(2,"0");
const validDate=(date:string)=>{
 const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
 if(!m)return null;
 const d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]));
 return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===date?d:null;
};
const monthDate=(year:number,monthZero:number,day:number)=>
 new Date(Date.UTC(year,monthZero,Math.min(day,new Date(Date.UTC(year,monthZero+1,0)).getUTCDate())));
const dateISO=(date:Date)=>date.toISOString().slice(0,10);
const addMonths=(date:Date,i:number)=>
 monthDate(date.getUTCFullYear(),date.getUTCMonth()+i,date.getUTCDate());
const norm=(x:unknown)=>String(x??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();

/**
 * invoiceMonth follows the existing Snake Finance ledger: CLOSING cycle month.
 * dueMonth / dueDate are separate presentation fields for when payment is due.
 * Never group ledger entries by dueMonth in the current engine.
 * Closing date precedes due date. C6 Carbon due day = 7.
 */
export function previewCarbonInstallments(payload:unknown,request:CarbonPreviewRequest){
 const db=payload as State;
 if(!db||!Array.isArray(db.cards)||!Array.isArray(db.transactions))
  return {ok:false as const,error:"invalid_finance_payload"};
 const card=db.cards.find((c:Item)=>String(c.id)===request.cardId);
 if(!card)return {ok:false as const,error:"card_not_found"};
 if(!/carbon/.test(norm(card.name))||/caju/.test(norm(card.name)))
  return {ok:false as const,error:"unsupported_card"};
 const configuredClosing=Number(card.closing),configuredDue=Number(card.due);
 if(!Number.isInteger(configuredClosing)||configuredClosing<1||configuredClosing>31)
  return {ok:false as const,error:"closing_day_missing"};
 if(configuredClosing!==CARBON_CLOSING_DAY)
  return {ok:false as const,error:"carbon_closing_day_conflict",
   configuredClosing,expectedClosing:CARBON_CLOSING_DAY};
 if(Number.isInteger(configuredDue)&&configuredDue>0&&configuredDue!==CARBON_DUE_DAY)
  return {ok:false as const,error:"carbon_due_day_conflict",configuredDue};
 const closing=CARBON_CLOSING_DAY,due=CARBON_DUE_DAY;
 const original=validDate(request.purchaseDate);
 if(!original)return {ok:false as const,error:"invalid_date"};
 if(!Number.isSafeInteger(request.totalCents)||request.totalCents<=0||request.totalCents>100_000_000_00)
  return {ok:false as const,error:"invalid_amount"};
 if(!Number.isInteger(request.installments)||request.installments<1||request.installments>48)
  return {ok:false as const,error:"invalid_installment_count"};
 const count=request.installments,each=Math.floor(request.totalCents/count),remainder=request.totalCents%count;
 if(each<=0)return{ok:false as const,error:"installments_exceed_amount"};
 let firstClosing=monthDate(original.getUTCFullYear(),original.getUTCMonth(),closing);
 if(original.getTime()>firstClosing.getTime())
  firstClosing=monthDate(original.getUTCFullYear(),original.getUTCMonth()+1,closing);
 const list=[];
 for(let i=0;i<count;i++){
  // Subsequent installments must advance exactly one BILLING CYCLE each.
  // Recomputing from the purchase anniversary may put two payments in one invoice.
  const closingDate=monthDate(firstClosing.getUTCFullYear(),firstClosing.getUTCMonth()+i,closing);
  const dueMonthOffset=due<=closing?1:0;
  const dueDate=monthDate(closingDate.getUTCFullYear(),closingDate.getUTCMonth()+dueMonthOffset,due);
  if(dueDate.getTime()<=closingDate.getTime())
   return{ok:false as const,error:"inconsistent_billing_cycle"};
  const amountCents=i===count-1?each+remainder:each;
  list.push({number:i+1,of:count,purchaseDate:dateISO(original),
   installmentReferenceDate:i===0?dateISO(original):dateISO(closingDate),
   closingDate:dateISO(closingDate),dueDate:dateISO(dueDate),
   invoiceMonth:dateISO(closingDate).slice(0,7),dueMonth:dateISO(dueDate).slice(0,7),amountCents});
 }
 return{ok:true as const,cardId:request.cardId,cardName:String(card.name||"C6 Carbon"),
  dueDay:due,closingDay:closing,totalCents:request.totalCents,installments:count,rows:list,
  ledgerUpdated:false,requiresLedgerCompatibilityReview:true,
  note:"Prévia somente: invoiceMonth segue o mês de fechamento do motor existente; dueMonth é o mês de vencimento. Nenhuma fatura foi alterada."};
}

/**
 * Caju = confirmed opening balance + one recharge for current month
 *        - realized expenses + realized refunds in that month.
 * No earlier recharge is summed again. No default or fabricated values.
 */
export function previewCajuMonth(payload:unknown,month:string){
 const db=payload as State;
 if(!db||!Array.isArray(db.transactions)||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
  return{ok:false as const,error:"invalid_caju_state_or_month"};
 const rechargeRaw=db.automationState?.cajuMonthlyTopups?.[month]??db.meta?.cajuRechargeByMonth?.[month];
 const openingRaw=db.meta?.cajuOpeningByMonth?.[month]??db.automationState?.cajuMonthlyOpenings?.[month];
 if(rechargeRaw===undefined||openingRaw===undefined)
  return{ok:false as const,error:"caju_opening_or_recharge_unverified",
   missingOpening:openingRaw===undefined,missingRecharge:rechargeRaw===undefined};
 const recharge=finiteCents(rechargeRaw),opening=finiteCents(openingRaw);
 if(recharge===null||opening===null||recharge<0||opening<0)
  return{ok:false as const,error:"invalid_caju_reference_values"};
 const cards=Array.isArray(db.cards)?db.cards:[];
 const cajuIds=new Set(cards.filter((c:Item)=>/caju/.test(norm(c.name))).map((c:Item)=>String(c.id)));
 if(!cajuIds.size)return{ok:false as const,error:"caju_card_not_found"};
 const seenIDs=new Set<string>(),seenSources=new Set<string>();
 let spent=0,refunds=0,rows=0;
 for(const t of db.transactions){
  if(!t||typeof t!=="object"||String(t.date||"").slice(0,7)!==month)continue;
  const status=norm(t.status||"realized");
  if(!["realized","real","realizado","realizada","paid","pago","posted"].includes(status))continue;
  const id=String(t.cardId||t.card||""),isCaju=t.benefit===true||cajuIds.has(id)||/caju/.test(norm(t.origin||t.source||""));
  if(!isCaju||t.invoicePayment||t.cardPayment||t.transfer||t.transferId)continue;
  const txId=t.id===undefined||t.id===null?"":String(t.id),sourceKey=t.sourceId&&t.sourceType?String(t.sourceType)+":"+String(t.sourceId):"";
  if(txId&&seenIDs.has(txId)||sourceKey&&seenSources.has(sourceKey))continue;
  if(txId)seenIDs.add(txId);if(sourceKey)seenSources.add(sourceKey);
  const cents=finiteCents(t.value);
  if(cents===null) return{ok:false as const,error:"invalid_caju_transaction_amount"};
  if(cents<0)spent-=cents;
  else if(cents>0){
   const evidence=norm([t.kind,t.sub,t.desc,t.description,t.type,t.origin].filter(Boolean).join(" "));
   const topup=/recarga|credito beneficio|caju beneficios|benefit[_ -]?topup|carga de beneficio/.test(evidence);
   const refund=/estorno|reembolso|refund|devolucao|chargeback/.test(evidence);
   if(topup===refund)
    return{ok:false as const,error:"caju_unclassified_credit_requires_review",transactionId:txId||undefined};
   if(refund)refunds+=cents;
   // Recharge appears once in the configured monthly field, never as another credit.
  }
  rows++;
 }
 const available=opening+recharge-spent+refunds;
 if(!Number.isSafeInteger(available))return{ok:false as const,error:"caju_balance_overflow"};
 return{ok:true as const,month,openingCents:opening,rechargeCents:recharge,
  expensesCents:spent,refundsCents:refunds,availableCents:available,rows,
  verifiedInputs:true,ledgerUpdated:false};
}


/**
 * Read-only view of committed versus planned credit-card installments.
 * invoiceMonth is the legacy closing-cycle key. dueMonth is the payment month.
 * No bank-account debit or invoice payment is generated.
 */
export function previewCarbonInvoices(payload:unknown,cardId:string,startMonth:string,months=6){
 const db=payload as State;
 if(!db||!Array.isArray(db.cards)||!Array.isArray(db.transactions))
  return{ok:false as const,error:"invalid_finance_payload"};
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(startMonth)||!Number.isInteger(months)||months<1||months>24)
  return{ok:false as const,error:"invalid_invoice_range"};
 const card=db.cards.find((c:Item)=>String(c.id)===cardId);
 if(!card||!/carbon/.test(norm(card.name))||/caju/.test(norm(card.name)))
  return{ok:false as const,error:"unsupported_card"};
 const configuredClosing=Number(card.closing),configuredDue=Number(card.due);
 if(!Number.isInteger(configuredClosing)||configuredClosing<1||configuredClosing>31)
  return{ok:false as const,error:"closing_day_missing"};
 if(configuredClosing!==CARBON_CLOSING_DAY)
  return{ok:false as const,error:"carbon_closing_day_conflict",
   configuredClosing,expectedClosing:CARBON_CLOSING_DAY};
 if(Number.isInteger(configuredDue)&&configuredDue>0&&configuredDue!==CARBON_DUE_DAY)
  return{ok:false as const,error:"carbon_due_day_conflict"};
 const closing=CARBON_CLOSING_DAY;
 const [baseYear,baseMonth]=startMonth.split("-").map(Number);
 const cycles=[];
 for(let i=0;i<months;i++){
  const closingDate=monthDate(baseYear,baseMonth-1+i,closing);
  const dueDate=monthDate(closingDate.getUTCFullYear(),closingDate.getUTCMonth()+(CARBON_DUE_DAY<=closing?1:0),CARBON_DUE_DAY);
  const key=dateISO(closingDate).slice(0,7);
  const cycle={invoiceMonth:key,closingDate:dateISO(closingDate),
   dueDate:dateISO(dueDate),dueMonth:dateISO(dueDate).slice(0,7),
   committedCents:0,plannedCents:0,totalCents:0,transactionCount:0};
  cycles.push(cycle);
 }
 const cycleByMonth = new Map<string, (typeof cycles)[number]>(
   cycles.map(row => [row.invoiceMonth, row] as const)
 );
 const seenIDs=new Set<string>(),seenSources=new Set<string>();
 for(const t of db.transactions){
  if(!t||typeof t!=="object")continue;
  if(![t.card,t.cardId,t.account].some(id=>id!==undefined&&id!==null&&String(id)===cardId))continue;
  if(t.invoicePayment||t.cardPayment||t.kind==="invoice_payment"||t.transfer)continue;
  const status=norm(t.status||"realized");
  if(["cancelled","canceled","cancelado","rejected","ignored"].includes(status))continue;
  const signedCents=finiteCents(t.value);
  if(signedCents===null)return{ok:false as const,error:"invalid_card_transaction_amount"};
  if(signedCents>=0)continue;
  const txId=t.id===undefined||t.id===null?"":String(t.id);
  const sourceKey=t.sourceId&&t.sourceType?String(t.sourceType)+":"+String(t.sourceId)+
   (Number.isInteger(t.installmentNo)?":part:"+String(t.installmentNo):""):"";
  if(txId&&seenIDs.has(txId)||sourceKey&&seenSources.has(sourceKey))continue;
  if(txId)seenIDs.add(txId);if(sourceKey)seenSources.add(sourceKey);
  const date=validDate(String(t.date||""));
  const derived=date?dateISO(
    date.getUTCDate()>closing?
    monthDate(date.getUTCFullYear(),date.getUTCMonth()+1,1):
    monthDate(date.getUTCFullYear(),date.getUTCMonth(),1)
  ).slice(0,7):null;
  const recorded=String(t.invoiceMonth||"");
  if(recorded&&!/^\d{4}-(0[1-9]|1[0-2])$/.test(recorded))
   return{ok:false as const,error:"invalid_invoice_month",transactionId:txId||undefined};
  if(!recorded&&!derived)return{ok:false as const,error:"invoice_month_missing",transactionId:txId||undefined};
  const cycle=cycleByMonth.get(recorded||derived||"");
  if(!cycle)continue;
  // 'planned' is a future obligation, not a paid/realized debit.
  if(["planned","pending","prevista","previsto","planejada","planejado","forecast"].includes(status))
   cycle.plannedCents-=signedCents;
  else if(["realized","real","realizado","realizada","posted","confirmed","confirmado","paid","pago"].includes(status))
   cycle.committedCents-=signedCents;
  else return{ok:false as const,error:"unrecognized_card_status",transactionId:txId||undefined};
  cycle.totalCents-=signedCents;
  cycle.transactionCount++;
 }
 return{ok:true as const,cardId,startMonth,months,rows:cycles,
  ledgerUpdated:false,totalsAreNotInvoicePayment:true,
  note:"Valores previstos e realizados por mês de fechamento, com vencimento informado separadamente. Nenhum pagamento foi efetuado."};
}
