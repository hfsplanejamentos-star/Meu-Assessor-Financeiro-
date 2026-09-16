/* Desktop only: remove the legacy demo text from quick-entry without touching user typing or mobile. */
(()=>{'use strict';
const desktop=()=>window.matchMedia('(min-width:821px)').matches;
const demo=/^Compra de R\$\s*86,40 em Supermercado Extra com cart[aã]o C6$/i;
const placeholder='Digite um lançamento ou faça uma pergunta financeira…';
function clean(input){if(!input||!desktop())return;if(demo.test(String(input.value||'').trim())){input.value='';input.defaultValue='';input.setAttribute('value','');input.dispatchEvent(new Event('input',{bubbles:true}));}input.placeholder=placeholder;input.autocomplete='off';input.spellcheck=false;}
function apply(){if(!desktop())return;document.querySelectorAll('.topbar .search input').forEach(clean);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
window.addEventListener('pageshow',apply);window.addEventListener('focus',apply);
let n=0;const timer=setInterval(()=>{apply();if(++n>=30)clearInterval(timer)},250);
const obs=new MutationObserver(apply);const start=()=>document.body&&obs.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['value']});if(document.body)start();else document.addEventListener('DOMContentLoaded',start);
})();