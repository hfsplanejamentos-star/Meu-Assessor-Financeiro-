/* Review only: no automatic ledger writes or whole-queue clearing. */
(function () {
  'use strict';
  const bridge = window.AndroidBridge || window.AndroidApp;
  if (!bridge || typeof bridge.getPendingNotifications !== 'function') return;
  window.handleAndroidBack=function(){
    if(typeof MD !== 'undefined' && MD){closeDay();return true;}
    const quick=document.getElementById('v64QuickMenu');
    if(quick?.classList.contains('open')){v65CloseQuick();return true;}
    const more=document.getElementById('moreMenu');
    if(more?.classList.contains('on')){closeMore();return true;}
    const settings=document.getElementById('settingsPop');
    if(settings?.classList.contains('on')){settings.classList.remove('on');return true;}
    if(typeof TAB !== 'undefined' && TAB!=='ger'){TAB='ger';draw();return true;}
    return false;
  };
  let pending = [], reviewItems = [];
  window.meuAssessorAndroidAutoSync = function () {
    try {
      const events = JSON.parse(bridge.getPendingNotifications());
      pending = Array.isArray(events) ? events.filter(e => e && typeof e.id === 'string').slice(0,500) : [];
      window.dispatchEvent(new CustomEvent('assessor-native-pending', {detail:{count:pending.length}}));
    } catch (_) { pending = []; }
    renderButton();
  };
  function renderButton() {
    let button=document.getElementById('native-review');
    if(!button){button=document.createElement('button');button.id='native-review';button.className='bt';button.style.cssText='position:fixed;right:12px;bottom:105px;z-index:40;max-width:220px';button.onclick=window.reviewNativeNotifications;document.body.appendChild(button);}
    button.textContent='Revisar notificações ('+pending.length+')';button.hidden=!pending.length;
  }
  window.reviewNativeNotifications=function(){
    window.meuAssessorAndroidAutoSync();
    reviewItems=pending.slice();
    const rows=reviewItems.map((event,i)=>{
      const value=Number.isSafeInteger(event.amountCents)?(event.amountCents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'Valor não identificado';
      return '<div class="li"><div><b>'+escapeHTML(event.title||event.sourcePackage||'Notificação')+'</b><p>'+escapeHTML(event.text||'')+'</p><p>'+escapeHTML(typeof ST !== 'undefined' && ST.hide ? 'R$ ••••' : value)+'</p><p class="h">Compare com seus lançamentos antes de registrar.</p></div><button class="bt" onclick="acknowledgeNativeNotification('+i+')">Já revisei</button></div>';
    }).join('');
    modal('Notificações para revisar',rows||'<p>Nenhuma notificação pendente.</p>');
  };
  window.acknowledgeNativeNotification=function(index){
    const event=reviewItems[index];if(!event)return;
    if(typeof bridge.acknowledgeNotifications!=='function'){alert('Atualize o aplicativo para concluir revisões individuais.');return;}
    if(!confirm('Marcar esta notificação como revisada? Confira primeiro se o lançamento foi registrado.'))return;
    if(!bridge.acknowledgeNotifications(JSON.stringify([event.id]))){alert('A revisão não foi salva. A notificação permanece na fila.');return;}
    window.reviewNativeNotifications();
  };
  window.meuAssessorAndroidAutoSync();
})();
