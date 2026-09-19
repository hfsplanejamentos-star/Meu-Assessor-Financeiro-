/* V10 AI gateway — backend LLM through Convex; no provider key in browser */
(()=>{'use strict';
const DEFAULT='https://effervescent-marlin-88.convex.site/ai/finance',KEY='assessor_ai_endpoint_v10';
const endpoint=()=>localStorage.getItem(KEY)||DEFAULT;
const money=s=>{const m=String(s).match(/(?:R\$\s*)?([\d.]+(?:,\d{1,2})?)/i);return m?Number(m[1].replace(/\./g,'').replace(',','.')):null};
function localInterpret(text){const v=money(text),income=/recebi|receita|sal[aá]rio|rescis[aã]o|entrou/i.test(text),expense=/gastei|paguei|comprei|compra|despesa/i.test(text);return v&&(income||expense)?{intent:'transaction',draft:{date:new Date().toISOString().slice(0,10),value:income?Math.abs(v):-Math.abs(v),cat:income?'Receitas':'Outros',desc:text,status:'draft'},mode:'local'}:{intent:'question',text,mode:'local'}}
async function interpret(text){const state=FinanceStoreV10.get(),month=new Date().toISOString().slice(0,7),context={summary:FinanceEngineV10.summary(state,month),categories:FinanceEngineV10.categoryTotals(state,month),dataMode:state.meta?.dataMode};try{const r=await fetch(endpoint(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,context})});if(r.ok){const x=await r.json();return{...x,mode:'llm'}}}catch(_){}return localInterpret(text)}
function validateDraft(d){return !!(d&&/^\d{4}-\d{2}-\d{2}$/.test(d.date)&&Number.isFinite(Number(d.value))&&d.value!==0&&String(d.desc||'').trim())}
function execute(d,confirmed=false){if(!confirmed)return{ok:false,requiresConfirmation:true,draft:d};if(!validateDraft(d))return{ok:false,error:'invalid_draft'};const tx={...d,id:d.id||'ai_'+Date.now(),status:'posted',source:'ai-confirmed'};FinanceStoreV10.upsertTx(tx);return{ok:true,transaction:tx}}
function configure(url){if(!/^https:\/\//.test(String(url||'')))throw new Error('HTTPS required');localStorage.setItem(KEY,url);return url}
window.FinanceAIV10={interpret,validateDraft,execute,configure,get endpoint(){return endpoint()},publicApiKey:false,backend:true};
})();