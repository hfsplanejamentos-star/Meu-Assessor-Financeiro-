/* Desktop only: remove legacy demo/autofill from financial quick-entry; mobile untouched. */
(()=>{'use strict';
const desktop=()=>window.matchMedia('(min-width:821px)').matches;
const demo=/^Compra de R\$\s*86,40 em Supermercado Extra com cart[aã]o C6$/i;
const placeholder='Digite um lançamento ou faça uma pergunta financeira…';
let userEditing=false;
function configure(input){if(!input||!desktop())return;input.name='financial_quick_entry';input.id=input.id||'financialQuickEntry';input.type='search';input.autocomplete='off';input.setAttribute('data-lpignore','true');input.setAttribute('data-1p-ignore','true');input.setAttribute('data-form-type','other');input.setAttribute('aria-autocomplete','none');input.spellcheck=false;input.placeholder=placeholder;if(demo.test(String(input.value||'').trim())){input.value='';input.defaultValue='';input.removeAttribute('value');}}
function apply(){if(!desktop())return;document.querySelectorAll('.topbar .search input').forEach(input=>{configure(input);if(!input.dataset.r69Bound){input.dataset.r69Bound='1';input.addEventListener('input',e=>{if(e.isTrusted)userEditing=true});input.addEventListener('focus',()=>{userEditing=true});input.addEventListener('blur',()=>{userEditing=false;if(demo.test(String(input.value||'').trim()))input.value=''});}});}
function purgeAutofill(){if(!desktop()||userEditing)return;document.querySelectorAll('.topbar .search input').forEach(input=>{if(demo.test(String(input.value||'').trim())){input.value='';input.defaultValue='';input.removeAttribute('value');input.blur();}});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{apply();purgeAutofill()});else{apply();purgeAutofill()}
window.addEventListener('pageshow',()=>{apply();purgeAutofill()});window.addEventListener('focus',()=>setTimeout(purgeAutofill,50));
[100,300,700,1200,2000,3500,6000].forEach(ms=>setTimeout(()=>{apply();purgeAutofill()},ms));
const obs=new MutationObserver(()=>{apply();purgeAutofill()});const start=()=>document.body&&obs.observe(document.body,{childList:true,subtree:true});if(document.body)start();else document.addEventListener('DOMContentLoaded',start);
})();