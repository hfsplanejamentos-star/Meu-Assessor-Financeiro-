/* Desktop only: keep quick-entry field empty on load; do not touch mobile. */
(()=>{'use strict';
const desktop=()=>window.matchMedia('(min-width:821px)').matches;
const placeholder='Digite um lançamento ou faça uma pergunta financeira…';
function reset(){if(!desktop())return;const input=document.querySelector('.topbar .search input');if(!input)return;if(!input.dataset.r69SearchReset){input.value='';input.defaultValue='';input.setAttribute('value','');input.dataset.r69SearchReset='1';}input.placeholder=placeholder;input.autocomplete='off';input.spellcheck=false;}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(reset,0));else setTimeout(reset,0);
setTimeout(reset,500);setTimeout(reset,1500);
})();