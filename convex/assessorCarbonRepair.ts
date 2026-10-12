/**
 * Prepare a configuration-only Carbon 5/7 update.
 * Never touch transactions/invoices. Do not auto-migrate cards with history.
 * Caller must provide a current baseVersion and explicit user confirmation.
 */
import { auditCarbonConfiguration } from "./assessorCarbonAudit";
import { CARBON_CLOSING_DAY, CARBON_DUE_DAY } from "./assessorProjection";

type State = Record<string, any>;
export function planCarbonConfigRepair(payload:unknown,cardId:string,now:string) {
 const report=auditCarbonConfiguration(payload,cardId);
 if(!report.ok)return{ok:false as const,error:report.error,report};
 if(report.configAligned)return{ok:true as const,alreadyAligned:true,updated:false,report};
 if(!report.safeMetadataOnly || report.mustReviewBeforeChanging)
  return{ok:false as const,error:"carbon_history_requires_reconciliation",report};
 const db=payload as State;
 const card=db.cards.find((c:Record<string,any>)=>String(c.id)===cardId);
 if(!card)return{ok:false as const,error:"card_not_found",report};
 const updatedCard={...card,closing:CARBON_CLOSING_DAY,due:CARBON_DUE_DAY};
 const updatedPayload={
   ...db,
   cards:db.cards.map((c:Record<string,any>)=>c===card?updatedCard:c),
   // Preserve canonical audit history. Do not manufacture financial transactions.
   auditLog:[
    {id:"assessor-carbon-"+cardId+"-"+now,ts:now,action:"edit",entity:"card",
     before:{id:cardId,closing:card.closing??null,due:card.due??null},
     after:{id:cardId,closing:CARBON_CLOSING_DAY,due:CARBON_DUE_DAY},
     meta:{scope:"Ajuste do cadastro C6 Carbon 5/7 — sem transações ou faturas"}},
    ...(Array.isArray(db.auditLog)?db.auditLog:[])
   ].slice(0,1000)
 };
 return{ok:true as const,alreadyAligned:false,updated:true,report,payload:updatedPayload};
}
