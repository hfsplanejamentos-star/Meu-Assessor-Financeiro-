/* V10 mobile theme controller */
(()=>{'use strict';
 const KEY='assessor_mobile_theme_v10',VALID=new Set(['current','dark','light']);
 function get(){const v=localStorage.getItem(KEY)||'current';return VALID.has(v)?v:'current'}
 function apply(v){v=VALID.has(v)?v:'current';document.documentElement.dataset.mobileTheme=v;localStorage.setItem(KEY,v);document.querySelectorAll('[data-v10-theme]').forEach(b=>b.classList.toggle('active',b.dataset.v10Theme===v));return v}
 function onThemeClick(event){const button=event.target.closest?.('[data-v10-theme]');if(!button)return;event.preventDefault();apply(button.dataset.v10Theme)}
 function mount(){if(document.getElementById('v10ThemeSwitch'))return;const box=document.createElement('div');box.id='v10ThemeSwitch';box.className='v10-theme-switch';box.setAttribute('aria-label','Tema do aplicativo');[['current','Atual'],['dark','Escuro'],['light','Claro']].forEach(([v,l])=>{const b=document.createElement('button');b.type='button';b.dataset.v10Theme=v;b.textContent=l;box.appendChild(b)});box.addEventListener('click',onThemeClick);document.body.appendChild(box);apply(get())}
 apply(get());if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
 window.MobileThemeV10={get,apply,mount};
})();
