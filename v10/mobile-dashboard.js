/* V10 Mobile Dashboard — layout/navigation only; RuntimeUI is the sole renderer */
(()=>{'use strict';
function route(r){if(typeof window.RuntimeUIV10?.go==='function')return RuntimeUIV10.go(r);if(typeof window.nav==='function')window.nav(r)}
function mountNav(){if(document.getElementById('v10BottomNav'))return;const n=document.createElement('nav');n.id='v10BottomNav';n.className='v10-bottom-nav';[['overview','Visão Geral','⌂'],['transactions','Transações','⇄'],['add','+','+'],['projection','Relatórios','▥'],['more','Mais','☰']].forEach(([r,l,i])=>{const b=document.createElement('button');b.type='button';b.innerHTML='<b>'+i+'</b><span>'+l+'</span>';b.onclick=()=>r==='add'?(document.querySelector('.fab-main')?.click()):r==='more'?(document.querySelector('.menu-btn')?.click()):route(r);n.appendChild(b)});document.body.appendChild(n)}
function install(){mountNav()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
window.MobileDashboardV10={mountNav};
})();