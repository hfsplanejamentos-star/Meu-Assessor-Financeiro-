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
 const session={draft:null,posting:false,cloud:null,month:today().slice(0,7),agendaDay:new Date(),recognition:null,files:[]};
 function toast(s){const box=$("toast");box.textContent=s;box.style.display="block";clearTimeout(window.__snakeToast);window.__snakeToast=setTimeout(()=>box.style.display="none",6000)}
 function switchView(name){for(const n of ["home","chat","agenda"])$("screen"+n[0].toUpperCase()+n.slice(1)).classList.toggle("active",n===name);document.querySelectorAll("nav [data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===name));$("topHome").style.display=name==="home"?"flex":"none";if(name==="chat")$("chatMessages").scrollTop=$("chatMessages").scrollHeight;window.scrollTo({top:0,behavior:"instant"})}
 document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>switchView(b.dataset.view)));
 function labelMonth(){const [y,m]=session.month.split("-").map(Number);$("monthLabel").textContent=new Date(y,m-1,1).toLocaleDateString("pt-BR",{month:"long",year:"numeric"}).replace(/^./,c=>c.toUpperCase())}
 function adjustMonth(step){const [y,m]=session.month.split("-").map(Number);const d=new Date(y,m-1+step,1);session.month=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");labelMonth();showAmounts()}
 $("prevMonth").onclick=()=>adjustMonth(-1);$("nextMonth").onclick=()=>adjustMonth(1);
 function eventRow(text,user=false){const el=document.createElement("div");el.className="bubble"+(user?" user":" answer");el.textContent=text;$("chatMessages").insertBefore(el,$("draftMount"));$("chatMessages").scrollTop=$("chatMessages").scrollHeight}
 function postableAccount(account){if(!account)return false;const key=norm([account.id,account.name,account.institution,account.type].join(" "));return !/caju|beneficio|credito|cartao|carbon|investimento|investment|poupanca|meta|(^|\s)xp(\s|$)/.test(key)&&/conta|corrente|dinheiro|banco|bank|checking|cash/.test(norm(account.type))}
 function presentAccount(id){const a=session.cloud?.payload?.accounts?.find(a=>String(a.id)===String(id));return a?.name || (id?"Conta não sincronizada":"Selecionar conta")}
 function showAmounts(){
   const state=session.cloud?.payload;
   if(!state)return;
   const a=Array.isArray(state.accounts)?state.accounts:[];
   for(const [id,rx] of [["balanceC6",/c6.*conta|conta.*c6/i],["balanceItau",/itau|itaú/i]]){
     const hits=a.filter(x=>rx.test(String(x.name||""))&&!/carbon|credito|crédito/i.test(String(x.name||"")));
     $(id).textContent=hits.length===1&&Number.isFinite(Number(hits[0].balance))?brl(hits[0].balance):"—";
   }
   $("balanceCaju").textContent="—"; // Caju requires the month-specific benefit engine.
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
   const payment=/cr[eé]dito/i.test(text)?"Crédito":/d[eé]bito/i.test(text)?"Débito":/pix/i.test(text)?"Pix":"Pix";
   const candidate={
     draftId:api?.newDraftId?.() || "demo-"+String(Date.now()),
     amount,direction:/recebi|recebimento|ganhei|sal[aá]rio/i.test(text)?"income":"expense",
     category:fuel?"Transporte":beer||food?"Alimentação":"Outros",
     subcategory:fuel?"Combustível":beer?"Cerveja":/padaria/i.test(text)?"Padaria":food?"Mercado":"",
     date:today(),account:"",payment,description:text,counterparty:"",sourceType:"chat",posted:false
   };
   const accounts=session.cloud?.payload?.accounts||[];
   const userBank=/\bcaju\b/i.test(text)?"caju":/\bxp\b/i.test(text)?"xp":/c6\s*carbon/i.test(text)?"carbon":/\bitau\b|\bitaú\b/i.test(text)?"itau":/\bc6\b/i.test(text)?"c6":"";
   if(userBank){
     const hits=accounts.filter(a=>norm([a.id,a.name].join(" ")).includes(userBank) &&
       (userBank!=="c6"||!/carbon/i.test(a.name||"")));
     if(hits.length===1)candidate.account=String(hits[0].id);
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
     ["Conta",presentAccount(d.account)],["Forma de pagamento",d.payment],
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
   const detail=document.createElement("p");detail.className="hint";detail.id="reviewStatus";
   detail.textContent=d.posted?"Registrado e vinculado ao financeiro.":"Confira todas as informações antes da confirmação.";
   card.append(detail);root.append(card);
   yes.onclick=postExpense;edit.onclick=openEditor;no.onclick=()=>{session.draft=null;reviewPreview();eventRow("Prévia cancelada. Nenhum lançamento financeiro foi efetuado.")};
   $("chatMessages").scrollTop=$("chatMessages").scrollHeight;
 }
 function openEditor(){
   const d=session.draft||guess("R$ 1,00");if(!d)return;
   session.draft=d;
   $("fieldAmount").value=d.amount;$("fieldDirection").value=d.direction;
   $("fieldCategory").value=d.category;$("fieldSubcategory").value=d.subcategory;
   fillAccounts();$("fieldAccount").value=d.account||"";
   $("fieldPayment").value=d.payment;
   $("fieldDate").value=d.date;$("fieldCounterparty").value=d.counterparty||"";
   $("fieldDescription").value=d.description;$("draftDialog").showModal();
 }
 $("draftDismiss").onclick=()=>$("draftDialog").close();
 $("draftForm").onsubmit=e=>{
   e.preventDefault();const d=session.draft;if(!d)return;
   const amount=Number($("fieldAmount").value);if(!moneyCents(amount))return toast("Informe um valor válido.");
   Object.assign(d,{amount,direction:$("fieldDirection").value,category:$("fieldCategory").value.trim(),
     subcategory:$("fieldSubcategory").value.trim(),account:$("fieldAccount").value,
     payment:$("fieldPayment").value,date:$("fieldDate").value,counterparty:$("fieldCounterparty").value.trim(),
     description:$("fieldDescription").value.trim()});
   $("draftDialog").close();switchView("chat");reviewPreview();toast("Prévia editada. Nenhum lançamento foi realizado.");
 };
 async function postExpense(){
   const d=session.draft;if(!d||session.posting||d.posted)return;
   if(!api||!session.cloud)return toast("Conecte a sincronização Cloud antes de lançar valores reais.");
   if(!d.account)return openEditor();
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
     await refreshState();reviewPreview();
   }catch(e){
     const uncertain=e.code==="posting_status_unknown";
     status.textContent=uncertain?"Resultado incerto após falha de rede. Consulte a conciliação antes de tentar novamente.":"Não lançado nesta tentativa: "+(e.code||e.message||"erro");
     toast(status.textContent);
   }finally{session.posting=false;controls.forEach(b=>b.disabled=!!d.posted);}
 }
 async function send(){
   const input=$("messageInput"),text=input.value.trim();if(!text)return;input.value="";
   eventRow(text,true);const local=guess(text);
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
 $("newExpense").onclick=()=>{session.draft={
   draftId:api?.newDraftId?.()||"demo-"+Date.now(),amount:0,direction:"expense",category:"Outros",
   subcategory:"",account:"",payment:"Pix",date:today(),counterparty:"",description:"",
   sourceType:"chat",posted:false};switchView("chat");openEditor()};
 $("checkSpending").onclick=()=>{switchView("chat");$("messageInput").value="Quanto gastei neste mês?";$("messageInput").focus()};
 function attach(){ $("addDialog").showModal() }
 $("attachBtn").onclick=attach;$("docShortcut").onclick=()=>$("documentFile").click();
 $("chooseDocument").onclick=()=>{$("addDialog").close();$("documentFile").click()};
 $("choosePhoto").onclick=()=>{$("addDialog").close();$("photoFile").click()};
 $("cameraBtn").onclick=()=>$("photoFile").click();$("photoBtn").onclick=()=>$("documentFile").click();
 $("chooseText").onclick=()=>{$("addDialog").close();switchView("chat");$("messageInput").focus()};
 $("addDismiss").onclick=()=>$("addDialog").close();
 function filesPicked(e){
   const files=Array.from(e.target.files||[]);if(!files.length)return;
   session.files=files;switchView("chat");
   eventRow("Anexo selecionado: "+files.map(f=>f.name).join(", ")+". Análise de PDF, foto e extrato ainda não ativada; nenhum dado foi transmitido.");
   e.target.value="";
 }
 $("documentFile").onchange=filesPicked;$("photoFile").onchange=filesPicked;
 function talk(){
   const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
   if(!SpeechRecognition)return toast("Transcrição por voz indisponível neste navegador. A integração de áudio está pendente.");
   if(session.recognition){session.recognition.stop();return}
   const r=new SpeechRecognition();r.lang="pt-BR";r.interimResults=false;
   r.onresult=event=>{$("messageInput").value=event.results[0][0].transcript;toast("Texto transcrito. Confira e toque em enviar.")};
   r.onerror=()=>toast("Áudio não transcrito. Verifique a permissão do microfone.");
   r.onend=()=>{session.recognition=null;$("voiceBtn").textContent="♩"};
   session.recognition=r;try{r.start();$("voiceBtn").textContent="■";toast("Ouvindo…")}catch{session.recognition=null;toast("Microfone indisponível")}
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
 // Read-only operation: never create, confirm or post a draft on startup.
 if(api)refreshState();
})();
