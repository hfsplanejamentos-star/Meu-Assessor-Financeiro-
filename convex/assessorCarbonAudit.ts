/**
 * Read-only risk assessment BEFORE changing an existing Carbon card's
 * closing/due dates. Never mutate a user's past transactions or paid invoices.
 */
import { CARBON_CLOSING_DAY, CARBON_DUE_DAY } from "./assessorProjection";

type Row = Record<string, any>;
const isRow = (v: unknown): v is Row => !!v && typeof v==="object" && !Array.isArray(v);
const norm = (v: unknown) => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const month = (d: Date) => d.toISOString().slice(0,7);

function dayFromDate(raw: unknown): Date | null {
 const str=String(raw ?? "");
 const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
 if(!m) return null;
 const date=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]));
 return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10)===str ? date : null;
}
function cycleOf(date:Date,closing:number) {
 const shift=date.getUTCDate()>closing ? 1 : 0;
 return month(new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+shift,1)));
}

export function auditCarbonConfiguration(payload:unknown,cardId:string){
 if(!isRow(payload)||!Array.isArray(payload.cards)||!Array.isArray(payload.transactions))
  return {ok:false as const,error:"invalid_finance_payload"};
 const matched=payload.cards.filter((c:unknown)=>isRow(c)&&String(c.id)===cardId);
 if(matched.length!==1)return {ok:false as const,error:"card_not_found_or_ambiguous"};
 const card=matched[0] as Row;
 if(!/carbon/.test(norm(card.name))||/caju/.test(norm(card.name)))
  return {ok:false as const,error:"unsupported_card"};
 const configuredClosing=Number(card.closing),configuredDue=Number(card.due);
 const validClosing=Number.isInteger(configuredClosing)&&configuredClosing>=1&&configuredClosing<=31;
 const validDue=Number.isInteger(configuredDue)&&configuredDue>=1&&configuredDue<=31;
 const configAligned=validClosing&&validDue&&configuredClosing===CARBON_CLOSING_DAY&&configuredDue===CARBON_DUE_DAY;
 const invoices=Array.isArray(payload.invoices)?payload.invoices.filter((i:unknown)=>isRow(i)&&String(i.cardId)===cardId):[];
 const affected:Row[]=[];
 let transactions=0,missingInvoiceMonth=0,cycleMismatch=0,invalidDates=0,explicitPreserved=0;
 for(const t of payload.transactions) {
  if(!isRow(t)||!([t.card,t.cardId,t.account].some(id=>id!==undefined&&id!==null&&String(id)===cardId)))continue;
  if(t.invoicePayment||t.cardPayment||t.kind==="invoice_payment"||t.transfer)continue;
  if(["cancelled","canceled","ignored","rejected"].includes(norm(t.status)))continue;
  transactions++;
  const date=dayFromDate(t.date);
  const savedCycle=typeof t.invoiceMonth==="string"&&/^\d{4}-(0[1-9]|1[0-2])$/.test(t.invoiceMonth)?t.invoiceMonth:null;
  if(!savedCycle)missingInvoiceMonth++;else explicitPreserved++;
  if(!date){invalidDates++;continue}
  const expectedCycle=cycleOf(date,CARBON_CLOSING_DAY);
  const oldInferredCycle=cycleOf(date,validClosing?configuredClosing:31);
  const actualCycle=savedCycle||oldInferredCycle;
  if(actualCycle!==expectedCycle){
   cycleMismatch++;
   if(affected.length<20)affected.push({
    transactionId:t.id===undefined?null:String(t.id),
    date:String(t.date),status:String(t.status||"realized"),
    currentInvoiceMonth:actualCycle,expectedInvoiceMonth:expectedCycle,
    invoiceMonthExplicit:Boolean(savedCycle),
   });
  }
 }
 const paidInvoices=invoices.filter((i:Row)=>i.status==="paid"||Boolean(i.paidAt)).length;
 const closedInvoices=invoices.filter((i:Row)=>i.status==="closed"||Boolean(i.closedAt)).length;
 const dueDateConflicts=invoices.filter((i:Row)=>{
  if(!i.dueDate||typeof i.dueDate!=="string")return false;
  const date=dayFromDate(i.dueDate);
  return !date||date.getUTCDate()!==CARBON_DUE_DAY;
 }).length;
 const riskCount=cycleMismatch+invalidDates+dueDateConflicts;
 // Only metadata can be safely changed automatically when no history exists.
 // Paid/closed invoices may be contractually final and must not be rewritten.
 const safeMetadataOnly=!transactions&&!invoices.length;
 const status=configAligned?"aligned":safeMetadataOnly?"safe_metadata_only":"manual_reconciliation_required";
 return {
  ok:true as const,readOnly:true,financeStateUpdated:false,cardId,
  expectedClosing:CARBON_CLOSING_DAY,expectedDue:CARBON_DUE_DAY,
  configuredClosing:validClosing?configuredClosing:null,
  configuredDue:validDue?configuredDue:null,
  status,configAligned,safeMetadataOnly,
  mustReviewBeforeChanging:!configAligned&&!safeMetadataOnly,
  transactions,missingInvoiceMonth,explicitPreserved,cycleMismatch,invalidDates,
  invoices:invoices.length,paidInvoices,closedInvoices,dueDateConflicts,
  riskCount,affected,
  guidance:configAligned?
   "O cadastro já corresponde ao fechamento dia 5 e vencimento dia 7.":
   safeMetadataOnly?
   "Sem histórico do cartão: a atualização dos metadados pode ser proposta para confirmação.":
   "Há histórico de faturas ou compras. Conciliar antes de mudar o cadastro; não alterar meses nem pagamentos automaticamente."
 };
}
