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
 const session={draft:null,posting:false,cloud:null,month:today().slice(0,7),agendaDay:new Date(),recognition:null,files:[],extractedRows:[]};
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
 function showAmounts(){
   const state=session.cloud?.payload;
   if(!state)return;
   const a=Array.isArray(state.accounts)?state.accounts:[];
   for(const [id,rx] of [["balanceC6",/c6.*conta|conta.*c6/i],["balanceItau",/itau|itaú/i]]){
     const hits=a.filter(x=>rx.test(String(x.name||""))&&!/carbon|credito|crédito/i.test(String(x.name||"")));
     $(id).textContent=hits.length===1&&Number.isFinite(Number(hits[0].balance))?brl(hits[0].balance):"—";
   }
   $("balanceCaju").textContent="—"; // Only show a benefit balance when its inputs are verified.
   const cajuMonth=session.month;
   if(api?.previewCajuMonth)api.previewCajuMonth(cajuMonth)
    .then(data=>{if(cajuMonth===session.month&&data.ok&&data.verifiedInputs)
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
   $("dataStatus").textContent="Consulta de leitura do financeiro: saldos e transações disponíveis. Caju e gráficos por categoria aguardam auditoria específica.";
 }
 async function refreshState(){
   if(!api){toast("Serviço do Assessor IA não carregou.");return null}
   try{
     const res=await api.readFinanceState();session.cloud=res.state||null;
     $("dataStatus").textContent=res.state?"Conectado em modo de leitura · versão "+res.state.version:"Sincronização sem dados cadastrados.";
     showAmounts();fillAccounts();toast(res.state?"Contas sincronizadas para consulta.":"Sem estado financeiro na nuvem.");
     return session.cloud;
   }catch(err){$("dataStatus").textContent="Financeiro não conectado · configure a chave no Snake Finance.";toast("Leitura da nuvem indisponível: "+(err.code||err.message));return null}
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
  }catch(e){toast("IA online indisponível; interpretação local para revisão.");}
  return null;
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
   const yes=document.createElement("button");yes.className="ok";yes.textContent="✓ Confirmar";yes.disabled=!!d.posted;
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
   yes.onclick=postExpense;edit.onclick=openEditor;no.onclick=()=>{session.draft=null;reviewPreview();eventRow("Prévia cancelada. Nenhum lançamento financeiro foi efetuado.");nextExtractedRow()};
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
   if(!api||!session.cloud)return toast("Conecte a sincronização Cloud antes de lançar valores reais.");
   if(!d.account||!d.payment)return openEditor();
   if(d.installments>1&&!(d.payment==="Crédito"&&String(d.account).startsWith("card:")))
     return toast("Parcelas somente no cartão de crédito. Nenhum valor foi lançado.");
   const account=(session.cloud.payload.accounts||[]).find(a=>String(a.id)===String(d.account));
   if(!postableAccount(account))return toast("Caju, XP, Carbon e cartões exigem integração específica. Nenhum valor foi lançado.");
   if(d.payment==="Crédito")return toast("Compra a crédito exige integração de fatura. Nenhum valor foi lançado.");
   const amountCents=moneyCents(d.amount);
   if(!amountCents)return toast("Valor inválido.");
   session.posting=true;
   const controls=$("draftMount").querySelectorAll("button");controls.forEach(b=>b.disabled=true);
   const status=$("reviewStatus");status.textContent="Confirmando lançamento no backend…";
   try{
     // Read the current version before posting, so concurrent updates are rejected.
     const latest=await api.readFinanceState();
     if(!latest.state)throw new Error("finance_state_missing");
     if(!(latest.state.payload?.accounts||[]).some(a=>String(a.id)===d.account&&postableAccount(a)))throw new Error("account_not_available");
     const prepared=await api.prepare({
       draftId:d.draftId,sourceType:d.sourceType,amountCents,direction:d.direction,account:d.account,
       transactionType:d.payment,category:d.category,subcategory:d.subcategory,
       description:d.description,date:d.date,counterparty:d.counterparty||undefined
     });
     // A prepared draft is immutable. Never silently post stale server fields
     // after a local edit or a timeout; require explicit reconciliation instead.
     if(prepared.duplicate)throw new Error("draft_already_prepared_review");
     const outcome=await api.confirmCash(d.draftId,latest.state.version);
     if(!outcome.posted)throw new Error("confirmed_not_posted");
     d.posted=true;status.textContent=outcome.syncPending?"Lançamento registrado; atualização local pendente.":"Lançamento confirmado no financeiro.";
     eventRow(outcome.syncPending?"Lançamento registrado no servidor. Sincronize a tela para atualizar os cards.":"Lançamento registrado com sucesso no Snake Finance.");
     await refreshState();reviewPreview();nextExtractedRow();
   }catch(e){
     const uncertain=e.code==="posting_status_unknown";
     status.textContent=uncertain?"Resultado incerto após falha de rede. Consulte a conciliação antes de tentar novamente.":"Não lançado nesta tentativa: "+(e.code||e.message||"erro");
     toast(status.textContent);
   }finally{session.posting=false;controls.forEach(b=>b.disabled=!!d.posted);}
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
       eventRow("C6 Carbon está cadastrado corretamente: fechamento dia 5 e vencimento dia 7. Nenhuma alteração necessária.");
       return;
     }
     eventRow("Auditoria do C6 Carbon: fechamento cadastrado "+
       (result.configuredClosing??"não definido")+", vencimento "+
       (result.configuredDue??"não definido")+". Regra confirmada: 5 e 7. "+
       result.transactions+" compras, "+result.invoices+" faturas armazenadas, "+
       result.cycleMismatch+" diferenças de ciclo, "+result.missingInvoiceMonth+
       " compras sem mês de fatura explícito e "+result.paidInvoices+
       " faturas pagas. Nenhum dado foi modificado.");
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
 $("newExpense").onclick=()=>{session.extractedRows=[];session.draft={
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
       toast("Análise não concluída: "+(err.code||err.message||"erro"));
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
     }catch(e){toast("Transcrição indisponível: "+(e.code||e.message||"erro"))}
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
 function settings(){$("settingsDialog").showModal()}
 $("settingsBtn").onclick=settings;$("chatSettings").onclick=settings;$("moreBtn").onclick=settings;
 $("settingsDismiss").onclick=()=>$("settingsDialog").close();
 document.querySelectorAll("[data-theme-option]").forEach(b=>b.onclick=()=>{
   const t=b.dataset.themeOption;document.body.dataset.theme=t;
   document.querySelectorAll("[data-theme-option]").forEach(x=>x.classList.toggle("selected",x===b));
   try{localStorage.setItem("snake_assessor_theme",t)}catch(_){}
 });
 try{const t=localStorage.getItem("snake_assessor_theme");if(["dourado","limao","branco"].includes(t)){document.body.dataset.theme=t;
   document.querySelectorAll("[data-theme-option]").forEach(b=>b.classList.toggle("selected",b.dataset.themeOption===t))}}catch(_){}
 $("refreshState").onclick=refreshState;
 $("financeBtn").onclick=()=>toast("Financeiro completo: use a tela principal do Snake Finance.");
 $("alertBtn").onclick=()=>toast("Avisos financeiros em desenvolvimento; nenhuma notificação fictícia será enviada.");
 $("alertShortcut").onclick=$("alertBtn").onclick;
 function agendaDate(){$("dayLabel").textContent=session.agendaDay.toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
 $("dayBack").onclick=()=>{session.agendaDay.setDate(session.agendaDay.getDate()-1);agendaDate()};
 $("dayForward").onclick=()=>{session.agendaDay.setDate(session.agendaDay.getDate()+1);agendaDate()};
 $("newMeeting").onclick=()=>toast("Criar reuniões requer conexão e permissão do calendário; nenhuma reunião será criada.");
 document.querySelectorAll(".tabs button").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tabs button").forEach(x=>x.classList.toggle("selected",x===b));toast("Integração de agenda pendente.")});
 document.querySelector(".status span").textContent=new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
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
 if(api)refreshState();
})();
