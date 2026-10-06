/* Capture inbox: explicit review, durable ledger first, source-scoped acknowledgement. */
(function () {
  'use strict';
  const bridge=window.AndroidBridge||window.AndroidApp;
  const native=!!bridge&&typeof bridge.getPendingNotifications==='function';
  let pending=[],reviewItems=[],waItems=[],activeSource='bank',draft=null,busy=false,loading=false,requestNumber=0,connectionGeneration=0;
  let config={url:'',configured:false},sessionKey='',status=null,connectionMessage='',answers=[];
  const requests=new Map();
  const safe=x=>escapeHTML(String(x??''));
  const money=v=>Number.isSafeInteger(v)?brl(v):'Valor a confirmar';
  const privacyText=t=>ST.hide?String(t).replace(/(?:R\$\s*)?\d[\d.]*,\d{2}/g,'R$ ••••'):t;
  function endpoint(value){try{const u=new URL(value);return u.protocol==='https:'&&/^[a-z0-9-]+\.convex\.site$/.test(u.hostname)&&!u.username&&!u.password&&(!u.port||u.port==='443')&&!u.search&&!u.hash&&['','/'].includes(u.pathname)?u.origin:null;}catch{return null;}}
  function loadConfig(){try{if(bridge?.getIntegrationConfig)config=JSON.parse(bridge.getIntegrationConfig());}catch{config={url:'',configured:false};}}
  loadConfig();
  window.addEventListener('snake-integration-result',e=>{const r=requests.get(e.detail?.id);if(r){requests.delete(e.detail.id);r(e.detail);}});
  async function api(path,method='GET',payload){
    if(!config.configured)throw Error('Conecte o serviço em Configurações → Captura, WhatsApp e IA.');
    const generation=connectionGeneration;
    let response;
    if(bridge?.integrationRequest){
      const id='capture_'+Date.now()+'_'+(++requestNumber);
      response=await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{requests.delete(id);reject(Error('O serviço demorou para responder. Tente novamente.'));},45000);requests.set(id,r=>{clearTimeout(timeout);resolve(r);});try{bridge.integrationRequest(id,path,method,payload?JSON.stringify(payload):'');}catch(error){clearTimeout(timeout);requests.delete(id);reject(error);}});
    }else{
      const res=await fetch(config.url+path,{method,headers:{'X-Sync-Key':sessionKey,'Content-Type':'application/json'},...(payload?{body:JSON.stringify(payload)}:{}),signal:AbortSignal.timeout(35000)});
      response={status:res.status,body:await res.text()};
    }
    if(generation!==connectionGeneration)throw Error('A conexão mudou. Atualize a lista antes de continuar.');
    let body;try{body=JSON.parse(response.body);}catch{throw Error('Resposta inválida do serviço.');}
    if(response.status<200||response.status>=300||body.ok===false){const messages={ai_not_configured:'A IA ainda precisa ser ativada no serviço.',invalid_sync_key:'A chave de acesso não é válida.',whatsapp_not_configured:'O WhatsApp ainda precisa ser ativado no serviço.',message_not_found:'A mensagem não foi encontrada. Atualize a lista.',rate_limited:'Aguarde um momento antes de tentar novamente.'};throw Error(messages[body.error]||'Não foi possível conectar ao serviço. Tente novamente.');}
    return body;
  }
  window.handleAndroidBack=function(){
    if(typeof MD!=='undefined'&&MD){closeDay();return true;}
    if(document.getElementById('v64QuickMenu')?.classList.contains('open')){v65CloseQuick();return true;}
    if(document.getElementById('moreMenu')?.classList.contains('on')){closeMore();return true;}
    if(document.getElementById('settingsPop')?.classList.contains('on')){document.getElementById('settingsPop').classList.remove('on');return true;}
    if(TAB!=='ger'){TAB='ger';draw();return true;}return false;
  };
  window.meuAssessorAndroidAutoSync=function(){
    if(native)try{const rows=JSON.parse(bridge.getPendingNotifications());pending=Array.isArray(rows)?rows.filter(e=>e&&typeof e.id==='string'&&e.id.length<=256).slice(0,500):[];}catch{connectionMessage='Não foi possível ler as notificações.';}
    let button=document.getElementById('native-review');
    if(native&&!button){button=document.createElement('button');button.id='native-review';button.className='bt';button.style.cssText='position:fixed;right:12px;bottom:105px;z-index:40;max-width:220px';button.onclick=window.reviewNativeNotifications;document.body.appendChild(button);}
    if(button){button.textContent='Revisar notificações ('+pending.length+')';button.hidden=!pending.length;}
    window.dispatchEvent(new CustomEvent('assessor-native-pending',{detail:{count:pending.length}}));
  };
  function rows(source){return source==='bank'?pending:waItems;}
  function captureKey(e){return e.source+':'+e.id;}
  function recorded(e){return L.find(x=>x.captureId===captureKey(e));}
  function normalized(source){return rows(source).map(e=>source==='bank'?{...e,source}:{id:e.messageId,title:'Mensagem do WhatsApp',text:e.text,postedAt:e.postedAt,source,connection:e.connection});}
  function body(source){
    reviewItems=normalized(source);
    return `<p class="m">Revise valor, conta e categoria antes de salvar. Limpar não exclui lançamentos.</p><div class="sp" style="gap:8px;margin:12px 0"><button class="bt" onclick="captureRefresh('${source}')">Atualizar</button><button class="bt" ${!reviewItems.length?'disabled':''} onclick="captureClear('${source}')">Limpar pendentes</button></div>${reviewItems.map((e,i)=>`<div class="c" style="margin:10px 0;padding:14px"><p><b>${safe(e.title||'Notificação bancária')}</b></p><p class="m" style="overflow-wrap:anywhere">${safe(privacyText(e.text||''))}</p><p style="font-size:1.25em;margin:8px 0"><b>${safe(ST.hide?'R$ ••••':money(e.amountCents))}</b></p><p class="m">${safe(new Date(e.postedAt).toLocaleDateString('pt-BR'))}${recorded(e)?' · Já registrado':''}</p><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="bt p" onclick="captureOpen(${i})">${recorded(e)?'Concluir revisão':'Revisar e registrar'}</button><button class="bt" onclick="captureDiscard(${i})">Dispensar</button></div></div>`).join('')||'<p>Nenhuma notificação pendente.</p>'}`;
  }
  window.reviewNativeNotifications=function(){window.meuAssessorAndroidAutoSync();activeSource='bank';modal('Notificações bancárias',body('bank'));MD='capture-inbox';};
  window.captureRefresh=async function(source){if(loading)return;loading=true;try{if(source==='bank')window.meuAssessorAndroidAutoSync();else{const result=await api('/whatsapp/messages');waItems=Array.isArray(result.messages)?result.messages.filter(m=>typeof m.messageId==='string'&&typeof m.text==='string'&&Number.isFinite(m.postedAt)).slice(0,50).map(m=>({...m,connection:connectionGeneration})):[];}if(source==='bank'){window.reviewNativeNotifications();}else{AS='wa';draw();}}catch(error){alert(error.message);}finally{loading=false;}};
  async function acknowledge(items,action){
    if(!items.length||items[0].source==='manual')return;
    if(items[0].source==='bank'){
      if(!bridge?.acknowledgeNotifications||!bridge.acknowledgeNotifications(JSON.stringify(items.map(e=>e.id))))throw Error('Não foi possível concluir a revisão. As notificações continuam pendentes.');
      window.meuAssessorAndroidAutoSync();
    }else{if(items.some(e=>e.connection!==connectionGeneration))throw Error('A conexão mudou. Atualize a lista antes de continuar.');await api('/whatsapp/resolve','POST',{messageIds:items.map(e=>e.id),status:action});const ids=new Set(items.map(e=>e.id));waItems=waItems.filter(e=>!ids.has(e.messageId));}
  }
  async function complete(items,action){if(busy)return;busy=true;try{await acknowledge(items,action);if(items[0]?.source==='bank')window.reviewNativeNotifications();else{AS='wa';draw();}}catch(error){alert(error.message);}finally{busy=false;}}
  window.captureClear=async function(source){const snapshot=reviewItems.filter(e=>e.source===source).map(e=>({...e}));if(!snapshot.length||!confirm(`Limpar ${snapshot.length} notificações pendentes? Os lançamentos já salvos serão mantidos.`))return;await complete(snapshot,'discarded');};
  window.captureDiscard=async function(index){const e=reviewItems[index];if(!e||!confirm('Dispensar esta notificação? Nenhum lançamento será excluído.'))return;await complete([e],'discarded');};
  function localDraft(e){
    const text=String(e.text||''),full=(e.title+' '+text).toLowerCase();let amount=e.amountCents;
    if(!Number.isSafeInteger(amount)){const match=[...text.matchAll(/(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})(?!\d)/g)];if(match.length===1)amount=Math.round(Number(match[0][1].replace(/\./g,'').replace(',','.'))*100);}
    const direction=['expense','income'].includes(e.direction)?e.direction:/\b(recebi|recebido|salário|salario|entrada)\b/.test(full)?'income':/\b(gastei|paguei|compra|comprou|pagamento|despesa|débito|debito)\b/.test(full)?'expense':'unknown';
    const account=/caju/.test(full+' '+(e.sourcePackage||''))?'caju':/c6/.test(full+' '+(e.sourcePackage||''))?(/carbon|cart[aã]o|cr[eé]dito/.test(full)?'carbon':'c6'):'';
    const date=new Date(e.postedAt),day=Number.isFinite(date.getTime())?`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`:APP_TODAY;
    return {type:direction==='income'?'r':direction==='expense'?'d':'',amount:Number.isSafeInteger(amount)&&amount>0?amount:null,account,day,name:(text||e.title||'Gasto capturado').slice(0,250),category:'out',sub:''};
  }
  window.captureOpen=async function(index){
    if(busy)return;const event=reviewItems[index];if(!event)return;
    if(!ST.msg){alert('Ative Registrar despesas por mensagem em Avisos para abrir rascunhos.');return;}
    if(recorded(event)){if(confirm('Este evento já está registrado. Concluir a revisão sem criar outro lançamento?'))await complete([event],'recorded');return;}
    draft={event,data:localDraft(event)};showDraft();
  };
  function showDraft(){
    if(!draft)return;const d=draft.data;
    modal('Revisar gasto capturado',`<p class="m">${safe(draft.event.source==='bank'?'Notificação bancária':'Mensagem do WhatsApp')} · Confirme os dados abaixo.</p><div class="fm"><label>Tipo<select id="capture-type"><option value="">Selecione</option><option value="d" ${d.type==='d'?'selected':''}>Despesa</option><option value="r" ${d.type==='r'?'selected':''}>Receita</option></select></label><label>Descrição<input id="capture-name" maxlength="250" value="${safe(d.name)}"></label><label>Valor (R$)<input id="capture-amount" inputmode="decimal" value="${d.amount?(d.amount/100).toFixed(2).replace('.',','):''}"></label><label>Data<input id="capture-date" type="date" value="${safe(d.day)}"></label><label>Conta<select id="capture-account"><option value="">Selecione a conta</option>${['c6','caju','carbon'].map(k=>`<option value="${k}" ${d.account===k?'selected':''}>${safe(AC[k][0])}</option>`).join('')}</select></label><label>Categoria<select id="capture-category" onchange="document.getElementById('capture-sub').innerHTML=subOptions(this.value)">${Object.keys(CATDB).map(k=>`<option value="${safe(k)}" ${d.category===k?'selected':''}>${safe(catName(k))}</option>`).join('')}</select></label><label>Subcategoria<select id="capture-sub">${subOptions(d.category)}</select></label><p class="m">Receitas não recebem categoria de despesa. Você pode corrigir todos os campos.</p>${config.configured?'<button class="bt" onclick="captureClassify()">Sugerir categoria com IA</button>':''}<button id="capture-save" class="bt p" onclick="captureSave()">Salvar lançamento</button><button class="bt" onclick="closeDay()">Cancelar e manter pendente</button></div>`);MD='capture-draft';
    if(d.sub){document.getElementById('capture-sub').value=d.sub;}
  }
  function readDraft(){const value=document.getElementById('capture-amount').value.trim().replace(/\./g,'').replace(',','.');return {type:document.getElementById('capture-type').value,name:document.getElementById('capture-name').value.trim(),amount:Math.round(Number(value)*100),day:document.getElementById('capture-date').value,account:document.getElementById('capture-account').value,category:document.getElementById('capture-category').value,sub:document.getElementById('capture-sub').value};}
  window.captureSave=async function(){
    if(busy||!draft)return;const event=draft.event,d=readDraft();
    if(!['r','d'].includes(d.type)||!d.name||!Number.isSafeInteger(d.amount)||d.amount<=0||!validISO(d.day)||!AC[d.account]||(d.type==='r'&&d.account==='carbon')||(d.type==='d'&&!CATDB[d.category])){alert('Confirme tipo, descrição, valor, data, conta e categoria.');return;}
    if(event.source==='whatsapp'&&event.connection!==connectionGeneration){alert('A conexão mudou. Atualize a lista antes de continuar.');return;}
    const duplicate=L.filter(x=>x.d===d.day&&x.a===d.account&&x.v===d.amount&&x.t===d.type);
    if(!recorded(event)&&duplicate.length&&!confirm(`Já existe ${duplicate.length} lançamento com o mesmo valor, data e conta. Registrar mesmo assim?`))return;
    busy=true;const button=document.getElementById('capture-save');if(button)button.disabled=true;
    try{
      if(!recorded(event)){
        if(PERSIST_BLOCKED)throw Error('Importe um backup válido antes de registrar.');
        const before=L.slice(),oldId=NID;
        const x={id:NID,d:d.day,n:d.name,t:d.type,v:d.amount,a:d.account,s:'r',captureId:captureKey(event)};
        if(d.type==='d'){x.c=d.category;x.sub=d.sub;}
        L.push(x);NID=nextId();
        if(!persistLedger()){L=before;NID=oldId;throw Error('O lançamento não foi salvo. A notificação continua pendente.');}
        YM=d.day.slice(0,7);SEL=d.day;
      }
      try{await acknowledge([event],'recorded');}catch(error){closeDay();draw();alert('Lançamento salvo. '+error.message+' Ao revisar novamente, escolha Concluir revisão.');return;}
      draft=null;closeDay();v65CloseQuick();TOAST='Lançamento salvo e notificação concluída';draw();
    }catch(error){alert(error.message);}finally{busy=false;if(button)button.disabled=false;}
  };
  function applyAi(result,current){
    if(result?.intent!=='transaction'||!result.draft||typeof result.draft.value!=='number'||!Number.isFinite(result.draft.value)||!Number.isSafeInteger(Math.round(Math.abs(result.draft.value)*100))||Math.abs(result.draft.value)<=0||!validISO(result.draft.date)||typeof result.draft.desc!=='string'||result.draft.desc.length>250)throw Error('A IA não identificou um lançamento válido. Revise os dados manualmente.');
    const r=result.draft,category=Object.keys(CATDB).find(k=>k===r.cat||catName(k).toLowerCase()===String(r.cat).toLowerCase())||'out';
    return {...current,type:r.value<0?'d':'r',name:r.desc,amount:Math.round(Math.abs(r.value)*100),day:r.date,category,sub:CATDB[category]?.subs?.includes(r.sub)?r.sub:''};
  }
  function aiContext(){return {today:APP_TODAY,month:YM,summary:{unit:'centavos de real',...D(),byCategory:cs('r')},categories:Object.keys(CATDB).map(k=>({id:k,name:catName(k),subs:CATDB[k].subs||[]}))};}
  window.captureClassify=async function(){if(busy||!draft)return;busy=true;const current=readDraft(),event=draft.event;try{const result=await api('/ai/finance','POST',{text:'Interprete esta mensagem como um rascunho para revisão: '+String(event.text||event.title).slice(0,3500),context:{today:current.day,categories:aiContext().categories}});if(MD!=='capture-draft'||draft?.event!==event)return;draft.data=applyAi(result,current);showDraft();}catch(error){alert(error.message);}finally{busy=false;}};
  window.captureBankPermissions=function(){bridge?.openCaptureSettings?.();};
  window.captureSettings=function(){loadConfig();document.getElementById('settingsPop')?.classList.remove('on');modal('Captura, WhatsApp e IA',`<div class="fm"><p>Notificações bancárias: ${native?'disponíveis neste Android':'disponíveis no aplicativo Android'}.</p>${native?'<button class="bt" onclick="captureBankPermissions()">Permissões dos bancos</button><button class="bt" onclick="reviewNativeNotifications()">Revisar notificações</button>':''}<p class="m">WhatsApp e IA precisam de um serviço conectado. A chave da IA fica no servidor.</p><label>Endereço do serviço<input id="capture-url" type="url" placeholder="https://seu-servico.convex.site" value="${safe(config.url)}"></label><label>Chave de acesso<input id="capture-key" type="password" autocomplete="off" placeholder="${config.configured?'Preencha somente para trocar a conexão':'Chave fornecida para sua conta'}"></label><button class="bt p" onclick="captureConnect()">Conectar e verificar</button><button class="bt" onclick="captureDisconnect()">Desconectar serviço</button><p id="capture-status" class="m">${safe(connectionMessage||'Conexão ainda não verificada.')}</p><p class="m">No Android, a chave é protegida no aparelho. No navegador, a conexão dura esta sessão. Mensagens de texto são revisadas antes de virar lançamentos.</p></div>`);MD='capture-settings';};
  window.captureConnect=async function(){if(busy)return;busy=true;try{
    const url=endpoint(document.getElementById('capture-url').value.trim()),key=document.getElementById('capture-key').value.trim();
    if(!url)throw Error('Informe o endereço HTTPS do serviço Convex.');
    if(key){connectionGeneration++;waItems=[];status=null;if(key.length<32||key.length>256||/[\r\n]/.test(key))throw Error('A chave deve ter entre 32 e 256 caracteres.');if(bridge?.saveIntegrationConfig){if(!bridge.saveIntegrationConfig(url,key))throw Error('Não foi possível proteger a conexão neste aparelho.');loadConfig();}else{sessionKey=key;config={url,configured:true};}}else if(!config.configured||url!==config.url)throw Error('Informe a chave para esta conexão.');
    document.getElementById('capture-key').value='';status=await api('/integrations/status');connectionMessage=`Serviço conectado · WhatsApp: ${status.whatsapp?'configurado':'aguardando ativação'} · IA: ${status.ai?'configurada':'aguardando ativação'}`;
    if(document.getElementById('capture-status'))document.getElementById('capture-status').textContent=connectionMessage;
  }catch(error){status=null;connectionMessage=error.message;const el=document.getElementById('capture-status');if(el)el.textContent=connectionMessage;}finally{busy=false;}};
  window.captureDisconnect=function(){if(busy)return;if(!confirm('Desconectar WhatsApp e IA neste aparelho? Seus lançamentos serão mantidos.'))return;if(bridge?.clearIntegrationConfig&&!bridge.clearIntegrationConfig()){alert('Não foi possível desconectar.');return;}connectionGeneration++;sessionKey='';config={url:'',configured:false};waItems=[];status=null;connectionMessage='Serviço desconectado.';window.captureSettings();};
  window.captureAsk=async function(){if(busy)return;const text=document.getElementById('capture-question')?.value.trim();if(!text||text.length>3500)return;busy=true;try{const result=await api('/ai/finance','POST',{text,context:aiContext()});if(result.intent==='transaction'){if(!ST.msg)throw Error('Ative Registrar despesas por mensagem em Avisos para abrir rascunhos.');const e={source:'manual',id:'ai_'+Date.now()+'_'+(++requestNumber),title:'Rascunho por IA',text,postedAt:Date.now()};draft={event:e,data:applyAi(result,localDraft(e))};showDraft();}else if(result.intent==='answer'&&typeof result.answer==='string'&&result.answer.length<=12000){answers.push({question:text,answer:result.answer});answers=answers.slice(-10);AS='chat';draw();}else throw Error('A IA retornou uma resposta inválida.');}catch(error){alert(error.message);}finally{busy=false;}};
  // Preserve all fixed-rule alerts; replace only the former demonstration tabs.
  const noticeDismissKey='assessor_notice_dismissals_v85';
  let dismissed=[];
  try{const saved=JSON.parse(localStorage.getItem(noticeDismissKey)||'[]');if(Array.isArray(saved))dismissed=saved.filter(x=>typeof x==='string'&&x.length<=4000).slice(-500);}catch{}
  const previousAlerts=financialAlerts;
  const signature=a=>JSON.stringify([localToday(),YM,a.key,a.text,a.ids]);
  financialAlerts=function(ym=YM){return previousAlerts(ym).filter(a=>!dismissed.includes(JSON.stringify([localToday(),ym,a.key,a.text,a.ids])));};
  window.clearAdvisorNotices=function(){const snapshot=financialAlerts(YM).map(signature);if(!snapshot.length||!confirm('Limpar os avisos exibidos hoje? Os lançamentos serão mantidos. Avisos voltam amanhã ou quando a situação mudar.'))return;const updated=[...new Set([...dismissed,...snapshot])].slice(-500);try{localStorage.setItem(noticeDismissKey,JSON.stringify(updated));dismissed=updated;draw();}catch{alert('Não foi possível salvar a limpeza dos avisos.');}};
  window.restoreAdvisorNotices=function(){try{localStorage.removeItem(noticeDismissKey);dismissed=[];draw();}catch{alert('Não foi possível restaurar os avisos.');}};
  const previousAlertList=alertListHTML;
  alertListHTML=function(){return `<div class="c"><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="bt" onclick="clearAdvisorNotices()">Limpar avisos de hoje</button><button class="bt" onclick="restoreAdvisorNotices()">Mostrar avisos limpos</button></div></div>`+previousAlertList();};
  const previousAs=vAs;
  vAs=function(){if(AS==='av')return previousAs().replace('Regras fixas, sem IA. Os avisos são atualizados ao usar o app. Envio externo e captura de texto, áudio ou foto precisam de integração.','Os alertas financeiros usam regras fixas. A captura bancária funciona no Android autorizado; WhatsApp e IA dependem da conexão configurada.').replace('Preferência para futura integração. O HTML não recebe mensagens, áudio ou fotos automaticamente.','Permite abrir rascunhos de notificações bancárias e mensagens de texto. Revise antes de salvar. Áudio e fotos do WhatsApp ainda não são recebidos.');const tabs=`<div class="c"><div class="fl">${['chat:Consultas','wa:WhatsApp','av:Avisos'].map(x=>{const [k,label]=x.split(':');return `<button class="${AS===k?'on':''}" onclick="AS='${k}';draw()">${label}</button>`;}).join('')}</div><p class="m">${safe(connectionMessage||(config.configured?'Serviço salvo; verifique a conexão nas configurações.':'WhatsApp e IA aguardam conexão.'))}</p><button class="bt" onclick="captureSettings()">Configurar conexão</button></div>`;
    if(AS==='wa'){activeSource='whatsapp';return tabs+`<div class="c"><h2>Gastos recebidos</h2><p class="m">Mensagens de texto. Nada é registrado sem sua confirmação.</p>${body('whatsapp')}</div>`;}
    return tabs+`<div class="c"><p>Pergunte sobre o mês ou descreva um gasto.</p><div class="fm"><label>Sua mensagem<textarea id="capture-question" maxlength="3500" placeholder="Ex.: gastei R$ 25,90 com almoço hoje"></textarea></label><button class="bt p" onclick="captureAsk()">Enviar para IA</button></div><p class="m">A consulta envia o resumo do mês e as categorias ao serviço conectado. Sugestões de lançamento precisam de revisão.</p></div>${answers.map(m=>`<div class="c"><p><b>${safe(m.question)}</b></p><p style="white-space:pre-wrap">${safe(m.answer)}</p></div>`).join('')}<div class="c"><p class="m">Consultas por regras continuam disponíveis:</p>${CH.l.map(k=>`<button class="qb" onclick="ask('${k}')">${safe(QA[k][0])}</button>`).join('')}${CH.m.map(m=>bub(m,0,'x')).join('')}</div>`;
  };
  // TABS stores the initial function reference; redirect the Assessor tab once.
  const assessorTab=TABS.find(t=>t[0]==='as');if(assessorTab)assessorTab[3]=()=>vAs();
  window.meuAssessorAndroidAutoSync();
})();
