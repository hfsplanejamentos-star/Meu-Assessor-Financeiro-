/* V10 AI gateway: interpretation and execution are deliberately separated. No public API key. */
(()=>{'use strict';
const API='/ai/finance',money=s=>{const m=String(s).match(/(?:R\$\s*)?([\d.]+(?:,\d{1,2})?)/i);return m?Number(m[1].replace(/\./g,'').replace(',','.')):null};
function localInterpret(text){const v=money(text),income=/recebi|receita|sal[aá]rio|rescis[aã]o|entrou/i.test(text),expense=/gastei|paguei|comprei|compra|despesa/i.test(text);return v&&(income||expense)?{intent:'transaction',draft:{date:new Date().toISOString().slice(0,10),value:income?Math.abs(v):-Math.abs(v),cat:income?'Receitas':'Outros',desc:text,status:'draft'}}:{intent:'question',text}}
async function interpret(text){try{const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,context:FinanceEngineV10?.summary(FinanceStoreV10.get(),new Date().toISOString().slice(0,7))})});if(r.ok)return await r.json()}catch(_){}return localInterpret(text)}
function validateDraft(d){return !!(d&&/^\d{4}-\d{2}-\d{2}$/.test(d.date)&&Number.isFinite(Number(d.value))&&d.value!==0&&String(d.desc||'').trim())}
function execute(d,confirmed=false){if(!confirmed)return{ok:false,requiresConfirmation:true,draft:d};if(!validateDraft(d))return{ok:false,error:'invalid_draft'};const tx={...d,id:d.id||'ai_'+Date.now(),status:'posted',source:'ai-confirmed'};FinanceStoreV10.upsertTx(tx);return{ok:true,transaction:tx}}
window.FinanceAIV10={interpret,validateDraft,execute,endpoint:API,publicApiKey:false};
})();