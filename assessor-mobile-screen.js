/* Snake Finance / Assessor IA Mobile. Interface based on the user-approved
 * gold/green/white design. Existing financeState remains the single source
 * of truth. No automatic ledger posting, document extraction or calendar writes.
 */
(() => {
 "use strict";
 const $=id=>document.getElementById(id);
 const api=window.SnakeAssessorApi;
 const brl=n=>Number(n).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
 const norm=s=>String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")};
 const moneyCents=n=>{const x=Math.round(Number(n)*100);return Number.isSafeInteger(x)&&x>0?x:null};
 const session={draft:null,posting:false,cloud:null,month:today().slice(0,7),agendaDay:new Date(),recognition:null,files:[],extractedRows:[],nativeRows:[],nativeSeen:new Set(),nativeScanBusy:false,connectionEpoch:0};
 function toast(s){const box=$("toast");box.textContent=s;box.style.display="block";clearTimeout(window.__snakeToast);window.__snakeToast=setTimeout(()=>box.style.display="none",6000)}
 function switchView(name){for(const n of ["home","chat","agenda"])$("screen"+n[0].toUpperCase()+n.slice(1)).classList.toggle("active",n===name);document.querySelectorAll("nav [data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===name));$("topHome").style.display=name==="home"?"flex":"none";if(name==="chat")$("chatMessages").scrollTop=$("chatMessages").scrollHeight;window.scrollTo({top:0,behavior:"instant"})}
 document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>switchView(b.dataset.view)));
 function labelMonth(){const [y,m]=session.month.split("-").map(Number);$("monthLabel").textContent=new Date(y,m-1,1).toLocaleDateString("pt-BR",{month:"long",year:"numeric"}).replace(/^./,c=>c.toUpperCase())}
 function adjustMonth(step){const [y,m]=session.month.split("-").map(Number);const d=new Date(y,m-1+step,1);session.month=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");labelMonth();showAmounts()}
 $("prevMonth").onclick=()=>adjustMonth(-1);$("nextMonth").onclick=()=>adjustMonth(1);
 function eventRow(text,user=false){const el=document.createElement("div");el.className="bubble"+(user?" user":" answer");el.textContent=text;$("chatMessages").insertBefore(el,$("draftMount"));$("chatMessages").scrollTop=$("chatMessages").scrollHeight}
 function postableAccount(account){if(!account)return false;const key=norm([account.id,account.name,account.institution,account.type].join(" "));return !/caju|beneficio|credito|cartao|carbon|investimento|investment|poupanca|meta|(^|\s)xp(\s|$)/.test(key)&&/conta|corrente|dinheiro|banco|bank|checking|cash/.test(norm(account.type))}
 function carbonConfigMessage(err){
   if(err?.code==="carbon_closing_day_conflict")
     return "O C6 Carbon está cadastrado com fechamento dia "+
       (err.details?.configuredClosing??"diferente de 5")+
       ". Você confirmou fechamento dia 5 e vencimento dia 7. É necessário conciliar o cadastro antes de projetar; nenhum lançamento foi alterado.";
   if(err?.code==="carbon_due_day_conflict")
     return "O vencimento cadastrado do C6 Carbon diverge do dia 7 confirmado. Confira os dados do cartão antes de calcular a fatura.";
   return "Não foi possível conferir a fatura: "+(err?.code||err?.message||"erro");
 }
 function presentAccount(id){
   if(String(id||"").startsWith("card:")){
     const c=(session.cloud?.payload?.cards||[]).find(c=>String(c.id)===String(id).slice(5));
     return c?.name||"Cartão (integração pendente)";
   }
   const a=session.cloud?.payload?.accounts?.find(a=>String(a.id)===String(id));
   return a?.name || (id?"Conta não sincronizada":"Selecionar conta");
 }
 // The category chart is driven ONLY by realized transactions from financeState.
 // Unclassified spending is grouped in "Outros" rather than invented categories.
 function resetCategoryChart(){
   $("categoryDonut").style.background="conic-gradient(var(--track) 0 100%)";
   document.querySelectorAll("[data-category-percent]").forEach(node=>node.textContent="—");
   $("cashFlowBar").style.background="var(--track)";
 }
 function categoryKey(transaction){
   const source=norm(transaction.category||transaction.categoryName||transaction.group||"");
   if(/moradia|aluguel|residen|condomin|habitac|energia|luz|saneamento/.test(source))return "moradia";
   if(/alimenta|mercado|padaria|restaurante|delivery|refeic|acougue|açougue/.test(source))return "alimentacao";
   if(/transport|combust|estacion|veicul|veícul|c4 cactus|automov/.test(source))return "transporte";
   if(/lazer|entreten|airsoft|cerveja|pagode|cinema|evento/.test(source))return "lazer";
   return "outros";
 }
 function renderFinanceGraphics(transactions,income,spent){
   resetCategoryChart();
   const total=income+spent;
   if(total>0){
     const incomePercent=100*income/total;
     $("cashFlowBar").style.background="linear-gradient(to right,var(--green) 0 "+incomePercent.toFixed(2)+"%,var(--red) "+incomePercent.toFixed(2)+"% 100%)";
   }
   const keys=["moradia","alimentacao","transporte","lazer","outros"];
   const colors=["#29a5d6","#34cd86","#f4bc41","#e98758","#9e9fa8"];
   const buckets={moradia:0,alimentacao:0,transporte:0,lazer:0,outros:0};
   for(const t of transactions){
     const value=Number(t.value);
     if(Number.isFinite(value)&&value<0)buckets[categoryKey(t)]+=-value;
   }
   const totalSpent=keys.reduce((sum,key)=>sum+buckets[key],0);
   if(totalSpent<=0)return;
   // Largest-remainder allocation avoids legends totaling 99% or 101%.
   const raw=keys.map(key=>100*buckets[key]/totalSpent);
   const percentages=raw.map(Math.floor);
   let remaining=100-percentages.reduce((a,b)=>a+b,0);
   const rank=raw.map((value,i)=>({i,remainder:value-Math.floor(value)}))
     .sort((a,b)=>b.remainder-a.remainder||a.i-b.i);
   for(let n=0;n<remaining;n++)percentages[rank[n].i]++;
   const stops=[];let start=0;
   for(let i=0;i<keys.length;i++){
     const share=raw[i];
     const node=document.querySelector('[data-category-percent="'+keys[i]+'"]');
     if(node)node.textContent=percentages[i]+"%";
     if(share<=0)continue;
     const end=start+share;
     stops.push(colors[i]+" "+start.toFixed(3)+"% "+end.toFixed(3)+"%");
     start=end;
   }
   $("categoryDonut").style.background="conic-gradient("+stops.join(",")+")";
 }
 function showAmounts(){
   const state=session.cloud?.payload;
   if(!state)return;
   const a=Array.isArray(state.accounts)?state.accounts:[];
   for(const [id,rx] of [["balanceC6",/c6.*conta|conta.*c6/i],["balanceItau",/itau|itaú/i]]){
     const hits=a.filter(x=>rx.test(String(x.name||""))&&!/carbon|credito|crédito/i.test(String(x.name||"")));
     $(id).textContent=hits.length===1&&Number.isFinite(Number(hits[0].balance))?brl(hits[0].balance):"—";
   }
   $("balanceCaju").textContent="—"; // Only show a benefit balance when its inputs are verified.
   const cajuMonth=session.month,epoch=session.connectionEpoch;
   if(api?.previewCajuMonth&&api?.hasSyncKey?.())api.previewCajuMonth(cajuMonth)
    .then(data=>{if(epoch===session.connectionEpoch&&api.hasSyncKey()&&session.cloud&&cajuMonth===session.month&&data.ok&&data.verifiedInputs)
      $("balanceCaju").textContent=brl(data.availableCents/100)})
    .catch(()=>{});
   const tx=Array.isArray(state.transactions)?state.transactions:[];
   const month=tx.filter(t=>String(t.date||"").startsWith(session.month)&&
     (!t.status||["realized","real","paid","received","posted"].includes(norm(t.status)))&&
     !t.transfer&&!t.transferId&&!t.invoicePayment&&!t.cardPayment&&!t.excludeFromExpense&&!t.excludeFromBalance&&
     !["transfer","invoice_payment","goal_transfer","reversal"].includes(String(t.kind||"")));
   const income=month.reduce((sum,t)=>sum+(Number(t.value)>0?Number(t.value):0),0);
   const spent=-month.reduce((sum,t)=>sum+(Number(t.value)<0?Number(t.value):0),0);
   $("monthIncome").textContent=brl(income);$("monthExpense").textContent=brl(spent);
   $("monthNet").textContent=brl(income-spent);$("donutSum").textContent=brl(spent);
   renderFinanceGraphics(month,income,spent);
   $("dataStatus").textContent="Consulta de leitura · categorias baseadas nos lançamentos realizados do mês. Valores do Caju exigem conciliação específica.";
 }
 async function refreshState(){
   const epoch=session.connectionEpoch;
   if(!api){toast("Serviço do Assessor IA não carregou.");return null}
   if(!api.hasSyncKey?.()){
     $("dataStatus").textContent="Sem conexão financeira. Notificações locais podem ser revisadas.";
     updateSyncConnectionStatus();
     return null;
   }
   try{
     const res=await api.readFinanceState();
     if(epoch!==session.connectionEpoch||!api.hasSyncKey?.())return null;
     session.cloud=res.state||null;
     $("dataStatus").textContent=res.state?"Conectado em modo de leitura · versão "+res.state.version:"Sincronização sem dados cadastrados.";
     showAmounts();fillAccounts();toast(res.state?"Contas sincronizadas para consulta.":"Sem estado financeiro na nuvem.");
     return session.cloud;
   }catch(err){
     if(epoch!==session.connectionEpoch)return null;
     $("dataStatus").textContent="Financeiro não conectado · configure a chave no Snake Finance.";
     updateSyncConnectionStatus();toast("Leitura da nuvem indisponível: "+(err.code||err.message));return null}
 }
 function clearCloudView(){
   session.connectionEpoch++;
   session.cloud=null;
   for(const id of ["balanceC6","balanceItau","balanceCaju","monthIncome","monthExpense","monthNet","donutSum"])
     $(id).textContent="—";
   $("dataStatus").textContent="Financeiro desconectado · sem acesso aos saldos.";
   resetCategoryChart();
   fillAccounts();
   updateSyncConnectionStatus();
 }
 function updateSyncConnectionStatus(){
   const connected=!!api?.hasSyncKey?.();
   $("syncConnectionStatus").textContent=!connected?
     "Não conectado. A fila Android continua disponível para revisão local.":
     session.cloud?
       "Conectado ao Snake Finance para consultas de leitura. Nenhuma despesa será efetivada pelo APK de testes.":
       "Chave configurada, mas nenhum saldo confirmado. Confira a sincronização.";
 }

 function fillAccounts(){
   const sel=$("fieldAccount"),old=sel.value;sel.replaceChildren(new Option("Selecione a conta sincronizada",""));
   const accounts=session.cloud?.payload?.accounts||[];
   if(!accounts.length){
     for(const [id,label] of [["demo:c6","C6 Conta Corrente"],["demo:carbon","C6 Carbon"],["demo:caju","Caju"],["demo:itau","Itaú"],["demo:xp","XP"]])
       sel.add(new Option(label+" · somente prévia",id));
   }
   for(const a of accounts){
     if(!a||!a.id)continue;
     const opt=new Option(a.name||String(a.id),String(a.id));
     if(!postableAccount(a))opt.textContent+=" · requer integração específica";
     sel.add(opt);
   }
   for(const c of (session.cloud?.payload?.cards||[])){
     if(!c?.id||!/caju|carbon/i.test(String(c.name||"")))continue;
     sel.add(new Option((c.name||String(c.id))+" · exige integração específica","card:"+c.id));
   }
   if([...sel.options].some(o=>o.value===old))sel.value=old;
 }
 function guess(text){
   // Local, advisory extraction only. AI may refine, never auto-post.
   const m=text.match(/(?:R\$\s*)?(\d{1,7}(?:\.\d{3})*(?:,\d{1,2})?|\d{1,7}(?:\.\d{1,2})?)\s*(?:reais|real)?/i);
   if(!m)return null;
   const raw=m[1],amount=Number(raw.includes(",")?raw.replace(/\./g,"").replace(",","."):raw);
   if(!Number.isFinite(amount)||amount<=0)return null;
   const fuel=/combustivel|combustível|gasolina|posto/i.test(text);
   const beer=/cerveja|chopp|chope/i.test(text);
   const food=/mercado|padaria|delivery|ifood/i.test(text);
   const payment=/cr[eé]dito/i.test(text)?"Crédito":/d[eé]bito/i.test(text)?"Débito":/pix/i.test(text)?"Pix":"";
   const candidate={
     draftId:api?.newDraftId?.() || "demo-"+String(Date.now()),
     amount,direction:/recebi|recebimento|ganhei|sal[aá]rio/i.test(text)?"income":"expense",
     category:fuel?"Transporte":beer||food?"Alimentação":"Outros",
     subcategory:fuel?"Combustível":beer?"Cerveja":/padaria/i.test(text)?"Padaria":food?"Mercado":"",
     date:today(),account:"",payment,installments:1,description:text,counterparty:"",sourceType:"chat",posted:false
   };
   const accounts=session.cloud?.payload?.accounts||[];
   const userBank=/\bcaju\b/i.test(text)?"caju":/\bxp\b/i.test(text)?"xp":/c6\s*carbon/i.test(text)?"carbon":/\bitau\b|\bitaú\b/i.test(text)?"itau":/\bc6\b/i.test(text)?"c6":"";
   if(userBank){
     const hits=accounts.filter(a=>norm([a.id,a.name].join(" ")).includes(userBank) &&
       (userBank!=="c6"||!/carbon/i.test(a.name||"")));
     if(hits.length===1)candidate.account=String(hits[0].id);
     else if(userBank==="caju"||userBank==="carbon"){
       const cards=(session.cloud?.payload?.cards||[]).filter(c=>norm(c.name).includes(userBank));
       if(cards.length===1)candidate.account="card:"+cards[0].id;
     }
   }
   return candidate;
 }
 async function interpretText(text){
  if(!api||!session.cloud)return null;
  try{
    const out=await api.interpretText(text);
    if(out.intent==="answer")return {answer:out.answer||"A consulta necessita de dados financeiros verificados."};
    if(out.intent==="transaction"&&out.draft){
     const d=out.draft;
     const amount=Math.abs(Number(d.value));
     if(!Number.isFinite(amount)||amount<=0)return null;
     return {amount,direction:Number(d.value)<0?"expense":"income",date:/^\d{4}-\d{2}-\d{2}$/.test(d.date||"")?d.date:today(),
       category:String(d.cat||"Outros"),subcategory:String(d.sub||""),description:String(d.desc||text)};
    }
  }catch(e){toast(e.code==="requires_hosted_https"?"HTML local: análise online exige hospedagem HTTPS; mantendo interpretação local.":"IA online indisponível; interpretação local para revisão.");}
  return null;
 }

 function alreadyLinkedNotification(id){
   if(!id)return false;
   const rows=session.cloud?.payload?.transactions;
   return Array.isArray(rows)&&rows.some(t=>t&&typeof t==="object"&&
     (t.androidNotificationId===id||(t.sourceType==="notification"&&t.sourceId===id)));
 }
 function nextNativeNotification(){
   if(session.posting||(session.draft&&!session.draft.posted))return false;
   if(!session.nativeRows.length)return false;
   const n=session.nativeRows.shift();
   const accounts=session.cloud?.payload?.accounts||[];
   const cards=session.cloud?.payload?.cards||[];
   // C6 account/card cannot be inferred from the same banking app notification.
   // User must explicitly choose C6 current account vs Carbon before posting.
   let account="";
   if(n.bank==="Caju"){
     const matches=cards.filter(x=>/caju/i.test(String(x.name||"")));
     if(matches.length===1)account="card:"+String(matches[0].id);
   }else if(n.bank==="XP"||n.bank==="Itaú"){
     const name=n.bank==="XP"?/\bxp\b/i:/itau|itaú/i;
     const matches=accounts.filter(x=>name.test(String(x.name||"")+" "+String(x.id||"")));
     if(matches.length===1)account=String(matches[0].id);
   }
   session.draft={
     draftId:api?.newDraftId?.()||"notification-"+n.sourceId,
     amount:n.amountCents/100,direction:n.direction,
     account,payment:n.paymentType,installments:1,
     category:n.category,subcategory:n.subcategory,
     date:n.date,description:n.description,counterparty:n.counterparty,
     sourceType:"notification",sourceId:n.sourceId,posted:false
   };
   eventRow("Notificação "+n.bank+" · "+brl(n.amountCents/100)+" · "+n.date+
     ". Confira direção, conta, modalidade, favorecido e categoria antes de confirmar.");
   switchView("chat");reviewPreview();
   return true;
 }

 function preserveNativeReview(){
   const d=session.draft;
   if(!d||d.posted||d.sourceType!=="notification")return;
   const native=window.SnakeAssessorNativeNotifications;
   const existing=native?.list?.().rows?.find(x=>x.sourceId===d.sourceId);
   if(existing&&!session.nativeRows.some(x=>x.sourceId===existing.sourceId)){
     session.nativeRows.unshift(existing);
     eventRow("Notificação bancária preservada na fila para revisão posterior.");
   }
 }
 function advanceReviewQueue(){
   if(session.extractedRows.length){nextExtractedRow();return}
   nextNativeNotification();
 }
 async function scanNativeNotifications(manual=false){
   if(session.nativeScanBusy)return;
   const native=window.SnakeAssessorNativeNotifications;
   if(!native?.available?.()){
     if(manual)eventRow("A captura automática está disponível somente no aplicativo Android autorizado.");
     return;
   }
   session.nativeScanBusy=true;
   try{
     const result=native.list();
     if(result.error){eventRow("A fila Android não pôde ser lida: "+result.error);return}
     let added=0,alreadySaved=0;
     for(const row of result.rows){
       if(alreadyLinkedNotification(row.sourceId)){
         // Production can reconcile an already-posted event by stable source ID.
         // The read-only preview never changes the Android queue silently.
         if(window.SNAKE_ASSESSOR_PREVIEW_ONLY!==true&&
            native.acknowledge(row.sourceId))alreadySaved++;
         continue;
       }
       if(session.nativeSeen.has(row.sourceId))continue;
       session.nativeSeen.add(row.sourceId);
       session.nativeRows.push(row);
       added++;
     }
     if(added){
       eventRow(added+" notificação(ões) aguardando revisão. "+
         "Nada foi lançado ou descartado automaticamente.");
       if(!session.draft||session.draft.posted)nextNativeNotification();
     }else if(manual){
       if((!session.draft||session.draft.posted)&&session.nativeRows.length)nextNativeNotification();
       eventRow(alreadySaved?
         alreadySaved+" notificação(ões) já registradas foram conciliadas e retiradas da fila Android.":
         session.nativeRows.length+" notificação(ões) já presentes na fila desta sessão. Nenhum lançamento novo.");
     }
     if(result.invalid&&manual)
       eventRow(result.invalid+" item(ns) inválido(s) ou não autorizado(s) não foram importados para revisão.");
   }finally{session.nativeScanBusy=false}
 }
 async function cancelReview(){
   const d=session.draft;if(!d||session.posting)return;
   if(d.sourceType==="notification"){
     if(typeof window.confirm!=="function"||
         !window.confirm("Descartar esta notificação da fila Android? Nenhum lançamento será criado."))return;
     const native=window.SnakeAssessorNativeNotifications;
     if(!native?.acknowledge(d.sourceId)){
       toast("Não consegui remover a notificação do Android. Ela permanece pendente.");
       return;
     }
     eventRow("Notificação descartada por sua confirmação. Nenhum lançamento efetuado.");
   }else eventRow("Prévia cancelada. Nenhum lançamento financeiro foi efetuado.");
   session.draft=null;reviewPreview();advanceReviewQueue();
 }

 function reviewPreview(){
   const d=session.draft,root=$("draftMount");root.replaceChildren();if(!d)return;
   const card=document.createElement("div");card.className="review";
   const title=document.createElement("h3");title.textContent=d.direction==="income"?"↗ Lançamento de Receita":"⛽ Lançamento de Despesa";card.appendChild(title);
   for(const [label,value] of [
     ["Valor",brl(d.amount)],["Categoria",d.category],["Subcategoria",d.subcategory||"—"],
     ["Conta",presentAccount(d.account)],...(d.payment==="Crédito"&&d.installments>1?[["Parcelas",String(d.installments)+"x"]]:[]),["Forma de pagamento",d.payment||"A revisar"],
     ["Data",d.date],["Estabelecimento",d.counterparty||"A revisar"]]){
      const pair=document.createElement("div");pair.className="pair";
      const a=document.createElement("span");a.textContent=label;
      const b=document.createElement("b");b.textContent=value;
      pair.append(a,b);card.append(pair);
   }
   const buttons=document.createElement("div");buttons.className="review-actions";
   const yes=document.createElement("button");yes.className="ok";yes.textContent=d.sourceType==="notification"?(d.direction==="income"?"✓ Salvar receita":"✓ Salvar despesa"):"✓ Confirmar";yes.disabled=!!d.posted;
   const edit=document.createElement("button");edit.textContent="✎ Editar";edit.disabled=!!d.posted;
   const no=document.createElement("button");no.className="stop";no.textContent="✕ Cancelar";no.disabled=!!d.posted;
   buttons.append(yes,edit,no);card.append(buttons);
   const reviewCard=(session.cloud?.payload?.cards||[]).find(c=>String(c.id)===String(d.account||"").slice(5));
   if(d.account?.startsWith("card:")&&/carbon/i.test(reviewCard?.name||"")&&d.payment==="Crédito"){
     const forecast=document.createElement("button");
     forecast.textContent="▣ Conferir parcelas e vencimentos";
     forecast.className="gold-button";forecast.style.marginTop="8px";
     forecast.onclick=async()=>{
       if(!api?.previewCardPurchase||!session.cloud)return toast("Conecte o financeiro para consultar a projeção.");
       forecast.disabled=true;
       try{
         const projection=await api.previewCardPurchase(d.account.slice(5),d.date,moneyCents(d.amount),d.installments||1);
         let existing=card.querySelector(".invoice-projection");if(existing)existing.remove();
         const details=document.createElement("div");details.className="invoice-projection hint";details.style.marginTop="10px";
         details.textContent="Somente prévia — nenhuma compra lançada. Vencimento dia "+
           projection.dueDay+". Fechamento dia "+projection.closingDay+".";
         for(const part of projection.rows){
           const line=document.createElement("p");
           line.textContent=part.number+"/"+part.of+" · Fatura "+part.dueDate+" · "+brl(part.amountCents/100);
           details.append(line);
         }
         card.append(details);
       }catch(err){toast(carbonConfigMessage(err))}
       finally{forecast.disabled=false}
     };
     card.append(forecast);
   }
   const detail=document.createElement("p");detail.className="hint";detail.id="reviewStatus";
   detail.textContent=d.posted?"Registrado e vinculado ao financeiro.":"Confira todas as informações antes da confirmação.";
   card.append(detail);root.append(card);
   yes.onclick=postExpense;edit.onclick=openEditor;no.onclick=cancelReview;
   $("chatMessages").scrollTop=$("chatMessages").scrollHeight;
 }
 function openEditor(){
   const d=session.draft||guess("R$ 1,00");if(!d)return;
   session.draft=d;
   $("fieldAmount").value=d.amount;$("fieldDirection").value=d.direction;
   $("fieldCategory").value=d.category;$("fieldSubcategory").value=d.subcategory;
   fillAccounts();$("fieldAccount").value=d.account||"";
   $("fieldPayment").value=d.payment;
   $("fieldInstallments").value=d.installments||1;
   updateInstallmentVisibility();
   $("fieldDate").value=d.date;$("fieldCounterparty").value=d.counterparty||"";
   $("fieldDescription").value=d.description;$("draftDialog").showModal();
 }
 function updateInstallmentVisibility(){
   const isCarbon=String($("fieldAccount").value||"").startsWith("card:")&&
      /carbon/i.test($("fieldAccount").selectedOptions?.[0]?.textContent||"");
   $("installmentField").hidden=!isCarbon||$("fieldPayment").value!=="Crédito";
   if($("installmentField").hidden)$("fieldInstallments").value="1";
 }
 $("fieldAccount").addEventListener("change",updateInstallmentVisibility);
 $("fieldPayment").addEventListener("change",updateInstallmentVisibility);
 $("draftDismiss").onclick=()=>$("draftDialog").close();
 $("draftForm").onsubmit=e=>{
   e.preventDefault();const d=session.draft;if(!d)return;
   const amount=Number($("fieldAmount").value);if(!moneyCents(amount))return toast("Informe um valor válido.");
   Object.assign(d,{amount,direction:$("fieldDirection").value,category:$("fieldCategory").value.trim(),
     subcategory:$("fieldSubcategory").value.trim(),account:$("fieldAccount").value,
     payment:$("fieldPayment").value,installments:Number($("fieldInstallments").value)||1,date:$("fieldDate").value,counterparty:$("fieldCounterparty").value.trim(),
     description:$("fieldDescription").value.trim()});
   $("draftDialog").close();switchView("chat");reviewPreview();toast("Prévia editada. Nenhum lançamento foi realizado.");
 };
 async function postExpense(){
   const d=session.draft;if(!d||session.posting||d.posted)return;
   if(window.SNAKE_ASSESSOR_PREVIEW_ONLY===true)
     return toast("Prévia Android: lançamentos reais desativados até a auditoria final.");
   if(!api||!session.cloud)return toast("Conecte a sincronização Cloud antes de lançar valores reais.");
   if(!d.account||!d.payment||!d.direction)return openEditor();
   if(d.installments>1&&!(d.payment==="Crédito"&&String(d.account).startsWith("card:")))
     return toast("Parcelas somente no cartão de crédito. Nenhum valor foi lançado.");
   const account=(session.cloud.payload.accounts||[]).find(a=>String(a.id)===String(d.account));
   if(!postableAccount(account))return toast("Caju, XP, Carbon e cartões exigem integração específica. Nenhum valor foi lançado.");
   if(d.payment==="Crédito")return toast("Compra a crédito exige integração de fatura. Nenhum valor foi lançado.");
   const amountCents=moneyCents(d.amount);
   if(!amountCents)return toast("Valor inválido.");
   session.posting=true;
   let advanceAfterPosting=false;
   const controls=$("draftMount").querySelectorAll("button");controls.forEach(b=>b.disabled=true);
   const status=$("reviewStatus");status.textContent="Confirmando lançamento no backend…";
   try{
     // Read the current version before posting, so concurrent updates are rejected.
     const latest=await api.readFinanceState();
     if(!latest.state)throw new Error("finance_state_missing");
     if(d.sourceType==="notification"&&Array.isArray(latest.state.payload?.transactions)&&
       latest.state.payload.transactions.some(t=>t&&(t.androidNotificationId===d.sourceId||
       (t.sourceType==="notification"&&t.sourceId===d.sourceId)))){
       d.posted=true;
       const cleared=window.SnakeAssessorNativeNotifications?.acknowledge(d.sourceId);
       eventRow("Notificação já vinculada a uma transação real. Nenhum segundo lançamento foi criado."+
         (cleared?"":" Não foi possível limpar a notificação local."));
       session.cloud=latest.state;
       reviewPreview();advanceAfterPosting=true;
       return;
     }
     if(!(latest.state.payload?.accounts||[]).some(a=>String(a.id)===d.account&&postableAccount(a)))throw new Error("account_not_available");
     const prepared=await api.prepare({
       draftId:d.draftId,sourceType:d.sourceType,sourceId:d.sourceId||undefined,amountCents,direction:d.direction,account:d.account,
       transactionType:d.payment,category:d.category,subcategory:d.subcategory,
       description:d.description,date:d.date,counterparty:d.counterparty||undefined
     });
     // A prepared draft is immutable. Never silently post stale server fields
     // after a local edit or a timeout; require explicit reconciliation instead.
     if(prepared.duplicate)throw new Error("draft_already_prepared_review");
     const outcome=await api.confirmCash(d.draftId,latest.state.version);
     if(!outcome.posted)throw new Error("confirmed_not_posted");
     d.posted=true;
     let nativeClearWarning=false;
     if(d.sourceType==="notification")
       nativeClearWarning=!window.SnakeAssessorNativeNotifications?.acknowledge(d.sourceId);
     status.textContent=outcome.syncPending?"Lançamento registrado; atualização local pendente.":"Lançamento confirmado no financeiro.";
     if(nativeClearWarning)eventRow("A movimentação foi registrada, mas a fila Android não pôde ser limpa. Não confirme novamente.");
     eventRow(outcome.syncPending?"Lançamento registrado no servidor. Sincronize a tela para atualizar os cards.":"Lançamento registrado com sucesso no Snake Finance.");
     await refreshState();reviewPreview();advanceAfterPosting=true;
   }catch(e){
     const uncertain=e.code==="posting_status_unknown";
     status.textContent=uncertain?"Resultado incerto após falha de rede. Consulte a conciliação antes de tentar novamente.":"Não lançado nesta tentativa: "+(e.code||e.message||"erro");
     toast(status.textContent);
   }finally{
     session.posting=false;
     controls.forEach(b=>b.disabled=!!d.posted);
     if(advanceAfterPosting)advanceReviewQueue();
   }
 }

 async function auditSavedCarbonSettings(){
   const cards=(session.cloud?.payload?.cards||[]).filter(c=>
     /carbon/i.test(String(c.name||""))&&!/caju/i.test(String(c.name||"")));
   if(!api?.auditCarbonSettings||cards.length!==1){
     eventRow("Não encontrei um único C6 Carbon na sincronização. Confira a conta antes de alterar qualquer cadastro.");
     return;
   }
   try{
     const result=await api.auditCarbonSettings(String(cards[0].id));
     if(result.configAligned){
       eventRow("C6 Carbon cadastrado com fechamento dia 5 e vencimento dia 7."+
         (result.riskCount>0?" Atenção: foram identificadas "+result.riskCount+
           " divergências no histórico de compras/vencimentos. É necessária revisão das faturas antigas; nada foi alterado.":
           " Nenhuma alteração necessária."));
       return;
     }
     eventRow("Auditoria do C6 Carbon: fechamento cadastrado "+
       (result.configuredClosing??"não definido")+", vencimento "+
       (result.configuredDue??"não definido")+". Regra confirmada: 5 e 7. "+
       result.transactions+" compras, "+result.invoices+" faturas armazenadas, "+
       result.cycleMismatch+" diferenças de ciclo, "+result.missingInvoiceMonth+
       " compras sem mês de fatura explícito e "+result.paidInvoices+
       " faturas pagas e "+(result.linkedRecurring||0)+
       " recorrências vinculadas. Nenhum dado foi modificado.");
     if(!result.safeMetadataOnly){
       eventRow("O cartão possui histórico. Por segurança, não alterarei o fechamento/vencimento automaticamente. É necessária conciliação das faturas antigas.");
       return;
     }
     const box=document.createElement("div");box.className="review";
     const message=document.createElement("p");message.className="hint";
     message.textContent="Este cartão não possui compras nem faturas. Você pode corrigir SOMENTE os dados de fechamento e vencimento; nenhum saldo ou transação será modificado.";
     const button=document.createElement("button");button.className="gold-button";
     button.textContent="Aplicar fechamento dia 5 e vencimento dia 7";
     box.append(message,button);$("chatMessages").insertBefore(box,$("draftMount"));
     button.onclick=async()=>{
       if(window.SNAKE_ASSESSOR_PREVIEW_ONLY===true){
         eventRow("Prévia Android: a correção do cartão está desativada neste aplicativo de testes.");
         return;
       }
       if(!window.confirm("Confirmar correção APENAS do cadastro do C6 Carbon para fechamento dia 5 e vencimento dia 7? O histórico não será alterado."))return;
       button.disabled=true;
       try{
         const changed=await api.repairCarbonSettings(String(cards[0].id),result.financeStateVersion);
         box.remove();
         eventRow(changed.alreadyAligned?"Cadastro já atualizado. Nenhuma gravação necessária.":
           "Cadastro do C6 Carbon corrigido para 5/7, sem modificar transações. Atualizando a leitura…");
         await refreshState();
       }catch(error){
         eventRow("Correção não realizada: "+(error.code||error.message||"erro")+
           ". Reinicie a auditoria para evitar sobrepor alterações de outro dispositivo.");
       }
     };
   }catch(error){
     eventRow("Não foi possível auditar o cartão: "+(error.code||error.message||"erro")+
       ". Nenhuma configuração foi modificada.");
   }
 }
 async function send(){
   const input=$("messageInput"),text=input.value.trim();if(!text)return;input.value="";
   preserveNativeReview();
   if(session.extractedRows.length){
     eventRow("Fila anterior encerrada: "+session.extractedRows.length+" item(ns) não foram lançados.");
     session.extractedRows=[];
   }
   eventRow(text,true);
   if(/verificar|conferir|auditar|corrigir/i.test(text)&&
      /carbon|cart[aã]o c6/i.test(text)&&
      /cadastro|configura|fechamento|vencimento|carbon/i.test(text)){
     await auditSavedCarbonSettings();
     return;
   }
   // Fatura do C6 Carbon: separar compras já lançadas de parcelas futuras,
   // sempre com vencimento dia 7 e mês da fatura no ciclo de fechamento.
   if(/fatura|parcelas? (?:do |de )?cart[aã]o/i.test(text)&&
      /carbon|c6|cart[aã]o|cr[eé]dito/i.test(text)){
     if(!session.cloud?.payload||!api?.listCarbonInvoices){
       eventRow("Para consultar a fatura, conecte primeiro o financeiro. Nenhum valor será estimado.");
       return;
     }
     const cards=(session.cloud.payload.cards||[]).filter(c=>
       /carbon/i.test(String(c.name||""))&&!/caju/i.test(String(c.name||"")));
     if(cards.length!==1){
       eventRow("Não foi possível identificar um único C6 Carbon no financeiro. Confira o cadastro.");
       return;
     }
     try{
       // Closing on day 5 and due on day 7 belong to the SAME month.
       // Start from the selected month, then show the next three cycles.
       const result=await api.listCarbonInvoices(String(cards[0].id),session.month,4);
       if(!result.ok)throw new Error(result.error||"invoice_unavailable");
       eventRow("Faturas C6 Carbon — incluindo fechamento dia 5 e vencimento dia 7 do mês selecionado e próximos ciclos. Valores comprometidos, NÃO pagamentos efetuados:");
       for(const cycle of result.rows){
         eventRow("Fechamento "+cycle.closingDate+" · Vencimento "+cycle.dueDate+
           ": "+brl(cycle.committedCents/100)+" já lançados + "+
           brl(cycle.plannedCents/100)+" parcelas previstas = "+
           brl(cycle.totalCents/100)+" comprometidos.");
       }
     }catch(err){
       eventRow(carbonConfigMessage(err)+" Nenhum valor foi alterado.");
     }
     return;
   }
   if(/\b(quanto|resumo|total|gastos|despesas)\b/i.test(text)){
     const summary=window.SnakeAssessorSummary?.summarize(text,session.cloud?.payload,session.month);
     if(summary){
       if(!summary.available){eventRow("Não há dados financeiros sincronizados para essa consulta. Nenhum valor será estimado.");return}
       const detail=summary.byBank.map(b=>b.bank+": "+brl(b.cents/100)).join("; ");
       eventRow("Em "+session.month+", "+summary.category+": "+brl(summary.totalCents/100)+
         " em "+summary.count+" lançamento(s) identificado(s)."+(detail?" Por origem: "+detail+".":"")+
         " Inclui despesas identificadas no Caju; registros sem classificação podem não aparecer.");
       return;
     }
   }
   const local=guess(text);
   if(!local){eventRow("Mensagem recebida. Consultas financeiras exigem conexão e verificação dos dados; não vou inventar valores.");return;}
   session.draft=local;
   const extra=await interpretText(text);
   if(extra?.answer){eventRow("A IA retornou uma resposta, mas valores financeiros precisam ser conferidos no histórico antes de serem exibidos.");return;}
   if(extra&&extra.amount){
      // Provider is advisory: account/payment still require user review.
      Object.assign(local,extra);
   }
   eventRow("Identifiquei uma movimentação. Confira valor, banco, categoria e data antes de confirmar.");
   reviewPreview();
 }
 $("sendBtn").onclick=send;$("messageInput").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();send()}});
 $("newExpense").onclick=()=>{preserveNativeReview();session.extractedRows=[];session.draft={
   draftId:api?.newDraftId?.()||"demo-"+Date.now(),amount:0,direction:"expense",category:"Outros",
   subcategory:"",account:"",payment:"",installments:1,date:today(),counterparty:"",description:"",
   sourceType:"chat",posted:false};switchView("chat");openEditor()};
 $("checkSpending").onclick=()=>{switchView("chat");$("messageInput").value="Quanto gastei neste mês?";$("messageInput").focus()};
 function attach(){ $("addDialog").showModal() }
 $("attachBtn").onclick=attach;$("docShortcut").onclick=()=>$("documentFile").click();
 $("chooseDocument").onclick=()=>{$("addDialog").close();$("documentFile").click()};
 $("choosePhoto").onclick=()=>{$("addDialog").close();$("photoFile").click()};
 $("cameraBtn").onclick=()=>$("photoFile").click();$("photoBtn").onclick=()=>$("documentFile").click();
 $("chooseText").onclick=()=>{$("addDialog").close();switchView("chat");$("messageInput").focus()};
 $("addDismiss").onclick=()=>$("addDialog").close();

 function nextExtractedRow(){
   if(!session.extractedRows.length)return;
   preserveNativeReview();
   const x=session.extractedRows.shift();
   const hint=norm(x.accountHint||"");
   const accounts=session.cloud?.payload?.accounts||[];
   const cards=session.cloud?.payload?.cards||[];
   let account="";
   if(/caju|carbon/.test(hint)){
     const matches=cards.filter(c=>norm(c.name||"").includes(hint.includes("caju")?"caju":"carbon"));
     if(matches.length===1)account="card:"+matches[0].id;
   }else if(/c6|itau|ita[uú]|xp/.test(hint)){
     const name=hint.includes("c6")?"c6":hint.includes("xp")?"xp":"itau";
     const matches=accounts.filter(a=>norm([a.name,a.id].join(" ")).includes(name)&&
       (name!=="c6"||!/carbon/.test(norm(a.name))));
     if(matches.length===1)account=String(matches[0].id);
   }
   const paymentKey=norm(x.paymentType||"");
   const payment=/credito/.test(paymentKey)?"Crédito":/debito/.test(paymentKey)?"Débito":
     /pix/.test(paymentKey)?"Pix":/dinheiro|especie/.test(paymentKey)?"Dinheiro":"";
   session.draft={
     draftId:api?.newDraftId?.()||"demo-"+Date.now(),
     amount:x.amountCents/100,direction:x.direction,account,payment,
     category:x.category,subcategory:x.subcategory,
     date:x.date,description:x.description,counterparty:x.counterparty,installments:1,
     sourceId:x.sourceId,sourceType:x.sourceType,posted:false
   };
   eventRow("Movimentação para revisão. Restam "+session.extractedRows.length+
     " item(ns) na fila. Confirme ou cancele este item para seguir.");
   reviewPreview();
 }
 function filesPicked(e){
   const files=Array.from(e.target.files||[]);
   e.target.value="";
   if(!files.length)return;
   if(files.length>1){toast("Selecione um documento por vez.");return}
   const file=files[0];
   session.files=[file];switchView("chat");
   const card=document.createElement("div");card.className="review";
   const heading=document.createElement("h3");heading.textContent="Analisar anexo: "+(file.name||"documento");
   const help=document.createElement("p");help.className="hint";
   help.textContent="Ao tocar em Analisar, o arquivo será enviado ao serviço de IA para extração. Nenhuma movimentação será registrada sem confirmação individual.";
   const buttons=document.createElement("div");buttons.className="review-actions";
   const go=document.createElement("button");go.className="ok";go.textContent="Analisar arquivo";
   const cancel=document.createElement("button");cancel.textContent="Descartar";
   buttons.append(go,cancel);card.append(heading,help,buttons);
   $("chatMessages").insertBefore(card,$("draftMount"));
   cancel.onclick=()=>{card.remove();session.files=[];eventRow("Arquivo descartado sem envio.")};
   go.onclick=async()=>{
     if(!api?.analyzeAttachment){toast("Serviço de análise indisponível.");return}
     go.disabled=true;go.textContent="Analisando…";
     try{
       const result=await api.analyzeAttachment(file);
       card.remove();session.files=[];
       if(!result.items?.length){
         eventRow("Análise concluída, mas nenhuma movimentação foi identificada com segurança. Confira o documento original.");
         return;
       }
       // One review at a time. Do not post statement rows in bulk.
       session.extractedRows=result.items.map(item=>({...item,sourceType:result.sourceType}));
       eventRow("Foram identificadas "+result.items.length+" movimentações em "+file.name+
         ". Os valores são sugestões da IA e precisam de revisão. "+
         (result.hasMore?"O documento tem mais linhas que o limite desta análise.":""));
       nextExtractedRow();
     }catch(err){
       go.disabled=false;go.textContent="Tentar análise novamente";
       toast("Análise não concluída: "+(err.code==="requires_hosted_https"?err.message:(err.code||err.message||"erro")));
     }
   };
 }
 $("documentFile").onchange=filesPicked;$("photoFile").onchange=filesPicked;

 async function recordVoiceFallback(){
   if(session.recorder){
     if(session.recorder.state!=="inactive")session.recorder.stop();
     return;
   }
   if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined"||!api?.transcribeAudio){
     toast("Gravação de áudio indisponível neste dispositivo.");
     return;
   }
   let stream;
   try{stream=await navigator.mediaDevices.getUserMedia({audio:true})}
   catch{toast("Permissão do microfone não concedida.");return}
   const mime=["audio/webm","audio/mp4","audio/ogg"].find(m=>MediaRecorder.isTypeSupported?.(m));
   if(!mime){stream.getTracks().forEach(t=>t.stop());toast("Formato de áudio indisponível.");return}
   const recorder=new MediaRecorder(stream,{mimeType:mime}),chunks=[];
   session.recorder=recorder;
   recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
   recorder.onerror=()=>toast("Erro durante a gravação do áudio.");
   recorder.onstop=async()=>{
     clearTimeout(session.voiceTimeout);
     stream.getTracks().forEach(t=>t.stop());
     session.recorder=null;$("voiceBtn").textContent="♩";
     const blob=new Blob(chunks,{type:mime});
     if(blob.size<32){toast("Áudio muito curto ou vazio.");return}
     if(blob.size>4_000_000){toast("Áudio excedeu 4 MB. Grave uma mensagem mais curta.");return}
     if(!window.confirm("Enviar este áudio ao serviço de IA para transcrição? Nenhuma despesa será lançada automaticamente.")){
       toast("Áudio descartado sem envio.");return;
     }
     try{
       toast("Transcrevendo áudio…");
       const result=await api.transcribeAudio(blob);
       $("messageInput").value=result.text;
       switchView("chat");
       toast("Áudio transcrito. Confira o texto e toque em Enviar.");
     }catch(e){toast("Transcrição indisponível: "+(e.code==="requires_hosted_https"?e.message:(e.code||e.message||"erro")))}
   };
   try{
     recorder.start();
     $("voiceBtn").textContent="■";
     toast("Gravando áudio. Toque novamente no microfone para finalizar (máximo 60 segundos).");
     session.voiceTimeout=setTimeout(()=>{if(recorder.state!=="inactive")recorder.stop()},60000);
   }catch{
     session.recorder=null;
     stream.getTracks().forEach(t=>t.stop());
     toast("Não foi possível iniciar a gravação.");
   }
 }
 function talk(){
   if(session.recorder){recordVoiceFallback();return}
   const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
   if(!SpeechRecognition){recordVoiceFallback();return}
   if(session.recognition){session.recognition.stop();return}
   const r=new SpeechRecognition();r.lang="pt-BR";r.interimResults=false;
   r.onresult=event=>{$("messageInput").value=event.results[0][0].transcript;toast("Texto transcrito. Confira e toque em Enviar.")};
   r.onerror=()=>toast("Não foi possível transcrever pelo navegador. Tente novamente ou use o anexo de áudio.");
   r.onend=()=>{session.recognition=null;$("voiceBtn").textContent="♩"};
   session.recognition=r;
   try{r.start();$("voiceBtn").textContent="■";toast("Ouvindo…")}
   catch{session.recognition=null;recordVoiceFallback()}
 }
 $("voiceBtn").onclick=talk;$("chooseVoice").onclick=()=>{$("addDialog").close();switchView("chat");talk()};
 function settings(){
   $("syncKeyField").value="";
   updateSyncConnectionStatus();
   $("settingsDialog").showModal();
 }
 $("connectFinance").onclick=async()=>{
   const candidate=$("syncKeyField").value.trim();
   if(!api?.setSyncKey)return toast("Serviço de sincronização indisponível.");
   let prior="";
   try { prior=localStorage.getItem("assessor_cloud_sync_key")||""; }catch(_){}
   $("connectFinance").disabled=true;
   try {
     api.setSyncKey(candidate);
     const epoch=++session.connectionEpoch;
     const result=await api.readFinanceState();
     if(epoch!==session.connectionEpoch)throw new Error("Conexão substituída durante a consulta.");
     if(!result?.state)throw new Error("Nenhum financeiro sincronizado foi encontrado para esta chave.");
     session.cloud=result.state;
     $("syncKeyField").value="";
     showAmounts();fillAccounts();updateSyncConnectionStatus();
     $("dataStatus").textContent="Consulta financeira conectada · versão "+result.state.version;
     toast("Sincronização de leitura conectada. Nenhum valor foi modificado.");
   }catch(error){
     try {
       if(prior)localStorage.setItem("assessor_cloud_sync_key",prior);
       else localStorage.removeItem("assessor_cloud_sync_key");
     }catch(_){}
     updateSyncConnectionStatus();
     toast("Conexão não concluída: "+(error.code||error.message||"erro"));
   }finally{$("connectFinance").disabled=false;$("syncKeyField").value=""}
 };
 $("disconnectFinance").onclick=()=>{
   if(!api?.hasSyncKey?.())return toast("O financeiro já está desconectado.");
   if(!window.confirm("Desconectar esta prévia do Snake Finance? Os saldos exibidos serão ocultados, e os dados do aplicativo principal permanecerão intactos."))return;
   try{api.disconnectSync();clearCloudView();$("syncKeyField").value="";
     toast("Sincronização desconectada apenas deste dispositivo.")}
   catch(error){toast("Falha ao desconectar: "+(error.message||"erro"))}
 };
 $("menuBtn").onclick=settings;
 $("settingsBtn").onclick=settings;$("chatSettings").onclick=settings;$("moreBtn").onclick=settings;
 $("settingsDismiss").onclick=()=>$("settingsDialog").close();
 function applyTheme(t){
   if(!["dourado","limao","branco"].includes(t))return;
   if(document.body?.dataset)document.body.dataset.theme=t;
   document.querySelectorAll("[data-theme-option]").forEach(b=>b.classList.toggle("selected",b.dataset.themeOption===t));
   document.querySelectorAll("[data-theme-shortcut]").forEach(b=>{
     b.setAttribute("aria-pressed",String(b.dataset.themeShortcut===t));
   });
   const metas=document.querySelectorAll('meta[name="theme-color"]');
   if(metas.length)metas[0].setAttribute("content",t==="branco"?"#eff3f5":"#090a08");
   try{localStorage.setItem("snake_assessor_theme",t)}catch(_){}
 }
 document.querySelectorAll("[data-theme-option]").forEach(b=>b.onclick=()=>applyTheme(b.dataset.themeOption));
 document.querySelectorAll("[data-theme-shortcut]").forEach(b=>b.onclick=()=>applyTheme(b.dataset.themeShortcut));
 let theme="dourado";
 try{const t=localStorage.getItem("snake_assessor_theme");if(["dourado","limao","branco"].includes(t))theme=t}catch(_){}
 applyTheme(theme);
 $("refreshState").onclick=refreshState;
 $("financeBtn").onclick=()=>toast("Financeiro completo: use a tela principal do Snake Finance.");
 $("alertBtn").onclick=()=>{switchView("chat");scanNativeNotifications(true)};
 $("alertShortcut").onclick=$("alertBtn").onclick;
 function agendaDate(){$("dayLabel").textContent=session.agendaDay.toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
 $("dayBack").onclick=()=>{session.agendaDay.setDate(session.agendaDay.getDate()-1);agendaDate()};
 $("dayForward").onclick=()=>{session.agendaDay.setDate(session.agendaDay.getDate()+1);agendaDate()};
 $("newMeeting").onclick=()=>toast("Criar reuniões requer conexão e permissão do calendário; nenhuma reunião será criada.");
 document.querySelectorAll(".tabs button").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tabs button").forEach(x=>x.classList.toggle("selected",x===b));toast("Integração de agenda pendente.")});
 // System clock and battery belong only to Android, never to a fake HTML status bar.
 session.month=today().slice(0,7);labelMonth();agendaDate();fillAccounts();
 // Pull-to-refresh: gesture triggers a read-only cloud update, never a post.
 let refreshTouchY=null,refreshTouchReady=false,refreshGestureBusy=false;
 document.addEventListener("touchstart",event=>{
   refreshTouchY=null;refreshTouchReady=false;
   if(event.touches?.length!==1||document.querySelector('dialog[open]'))return;
   if(event.target?.closest?.(".chat-scroll,.compose,.review,dialog,nav"))return;
   if((document.scrollingElement?.scrollTop||0)>2)return;
   refreshTouchY=event.touches[0].clientY;
   refreshTouchReady=true;
 },{passive:true});
 document.addEventListener("touchend",async event=>{
   if(!refreshTouchReady||refreshTouchY===null||refreshGestureBusy)return;
   refreshTouchReady=false;
   const endY=event.changedTouches?.[0]?.clientY;
   if(typeof endY!=="number"||endY-refreshTouchY<90)return;
   refreshGestureBusy=true;
   try{await refreshState()}finally{refreshGestureBusy=false}
 },{passive:true});
 // Read-only operation: never create, confirm or post a draft on startup.
 updateSyncConnectionStatus();
 if(api?.hasSyncKey?.())refreshState();
 // Native callback only queues an editable review; no financial posting on event.
 const oldNativeCallback=window.meuAssessorAndroidAutoSync;
 window.meuAssessorAndroidAutoSync=()=>{
   if(typeof oldNativeCallback==="function")try{oldNativeCallback()}catch(_){}
   scanNativeNotifications(false);
 };
 if(window.SnakeAssessorNativeNotifications?.available?.())
   scanNativeNotifications(false);
})();
