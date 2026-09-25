/* R9.5 - Entrada de lancamento por imagem (camera/galeria) */
(()=>{
 const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 function ensureUI(){
  if(document.getElementById('imageEntryInput'))return;
  const input=document.createElement('input'); input.type='file'; input.id='imageEntryInput'; input.accept='image/*'; input.style.display='none';
  document.body.appendChild(input);
  const modal=document.createElement('div'); modal.id='imageEntryModal'; modal.className='modal';
  modal.innerHTML='<div class="modal-card"><div class="modal-head"><h3>Adicionar por imagem</h3><button class="close" type="button">×</button></div><div id="imageEntryBody"></div></div>';
  document.body.appendChild(modal);
  modal.querySelector('.close').onclick=()=>modal.classList.remove('open');
  modal.onclick=e=>{if(e.target===modal)modal.classList.remove('open')};
  input.onchange=()=>{const f=input.files?.[0];if(f)preview(f);input.value=''};
 }
 function launch(mode){
  ensureUI(); const i=document.getElementById('imageEntryInput');
  if(mode==='camera')i.setAttribute('capture','environment');else i.removeAttribute('capture');
  i.click();
 }
 function preview(file){
  if(!file.type.startsWith('image/'))return;
  if(file.size>12*1024*1024){alert('Imagem muito grande. Use uma imagem de ate 12 MB.');return}
  const url=URL.createObjectURL(file),m=document.getElementById('imageEntryModal'),b=document.getElementById('imageEntryBody');
  b.innerHTML='<img src="'+url+'" alt="Comprovante selecionado" style="width:100%;max-height:260px;object-fit:contain;border-radius:14px;background:#030b16"><div class="notice" id="imgOcrStatus" style="margin-top:12px">Lendo valor, data e descrição…</div><div class="form-grid" style="margin-top:12px"><div class="field"><label>Tipo</label><select id="imgType"><option value="expense">Despesa</option><option value="income">Receita</option></select></div><div class="field"><label>Valor</label><input id="imgValue" inputmode="decimal" placeholder="0,00"></div><div class="field"><label>Data</label><input id="imgDate" type="date"></div><div class="field"><label>Descrição</label><input id="imgDesc" placeholder="Ex.: Pix, mercado, parcela..."></div><div class="field"><label>Categoria</label><input id="imgCat" placeholder="Categoria"></div><div class="field"><label>Conta</label><input id="imgAccount" placeholder="C6, Caju, XP..."></div></div><details id="imgOcrDetails" style="margin-top:10px"><summary>Texto reconhecido</summary><pre id="imgOcrText" style="white-space:pre-wrap;font-size:12px;color:var(--muted);max-height:140px;overflow:auto"></pre></details><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="secondary" id="imgCancel">Cancelar</button><button class="primary" id="imgConfirm">Revisar e incluir</button></div>';
  document.getElementById('imgDate').value=new Date().toISOString().slice(0,10);
  document.getElementById('imgCancel').onclick=()=>{m.classList.remove('open');URL.revokeObjectURL(url)};
  document.getElementById('imgConfirm').onclick=()=>{
   const val=Number(String(document.getElementById('imgValue').value).replace(/\./g,'').replace(',','.'));
   if(!Number.isFinite(val)||val<=0){alert('Informe o valor para confirmar o lancamento.');return}
   const type=document.getElementById('imgType').value,tx={id:'img_'+Date.now(),date:document.getElementById('imgDate').value,desc:document.getElementById('imgDesc').value.trim()||'Lancamento por imagem',cat:document.getElementById('imgCat').value.trim()||(type==='income'?'Receitas':'Outros'),sub:'Imagem',value:type==='expense'?-Math.abs(val):Math.abs(val),status:'realized',source:'Imagem',origin:document.getElementById('imgAccount').value.trim()||'Imagem'};
   if(typeof db==='undefined'||!db||!Array.isArray(db.transactions)){alert('Base financeira ainda nao esta pronta.');return}
   db.transactions.push(tx); try{if(typeof save==='function')save()}catch(_){}
   document.dispatchEvent(new CustomEvent('finance-data-changed',{detail:{source:'image-entry',id:tx.id}}));
   m.classList.remove('open');URL.revokeObjectURL(url); alert('Lancamento incluido e confirmado.');
  };
 m.classList.add('open');
 }
 function parseOcr(text){
  const lines=String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const money=/\b(?:R\$\s*)?(-?\d{1,3}(?:\.\d{3})*,\d{2})\b/i;
  const candidates=[];
  lines.forEach((line,index)=>{const match=line.match(money);if(!match)return;let score=0;if(/total|valor pago|pagamento|compra|d[eé]bito|pix/i.test(line))score+=8;if(/saldo|limite|economia|desconto/i.test(line))score-=6;candidates.push({line,index,value:match[1],score})});
  candidates.sort((a,b)=>b.score-a.score||a.index-b.index);
  const best=candidates[0];
  if(best){document.getElementById('imgValue').value=best.value.replace('-','');const nearby=[lines[best.index-1],best.line].filter(Boolean).join(' ');const desc=nearby.replace(money,'').replace(/\b(total|valor pago|pagamento|compra|d[eé]bito)\b/ig,'').replace(/\s+/g,' ').trim();if(desc)document.getElementById('imgDesc').value=desc.slice(0,90)}
  const dateText=lines.join(' ').match(/\b(\d{2})[\/.-](\d{2})[\/.-](\d{4})\b/);if(dateText)document.getElementById('imgDate').value=`${dateText[3]}-${dateText[2]}-${dateText[1]}`;
  const all=lines.join(' ');const account=/caju/i.test(all)?'Caju':/c6/i.test(all)?'C6 Bank':/nubank/i.test(all)?'Nubank':/ita[uú]/i.test(all)?'Itaú':/\bxp\b/i.test(all)?'XP':'';if(account)document.getElementById('imgAccount').value=account;
  if(typeof guessCategory==='function'&&document.getElementById('imgDesc').value){const g=guessCategory(document.getElementById('imgDesc').value,-1);if(g?.cat)document.getElementById('imgCat').value=g.cat}
  document.getElementById('imgOcrText').textContent=text;
  document.getElementById('imgOcrStatus').textContent=best?'Dados identificados. Confira antes de incluir.':'Texto lido, mas o valor precisa ser informado.';
 }
 function install(){
  ensureUI();
  const importImageBtn=document.getElementById('importImageBtn');
  if(importImageBtn&&!importImageBtn.dataset.imageEntryBound){
   importImageBtn.dataset.imageEntryBound='1';
   importImageBtn.onclick=()=>launch('gallery');
  }
  const menus=[...document.querySelectorAll('.fab-menu')];
  menus.forEach(menu=>{if(menu.querySelector('[data-image-entry]'))return;const b=document.createElement('button');b.type='button';b.className='fab-action';b.dataset.imageEntry='1';b.innerHTML='<span>Adicionar por imagem</span><i>▣</i>';b.onclick=()=>launch('gallery');menu.appendChild(b)});
  window.MeuAssessorImageEntry={gallery:()=>launch('gallery'),camera:()=>launch('camera')};
 }
 window.addEventListener('android-ocr-result',event=>{const d=event.detail||{};if(d.text&&document.getElementById('imageEntryModal')?.classList.contains('open'))parseOcr(d.text);else{const s=document.getElementById('imgOcrStatus');if(s)s.textContent=d.status||'Não foi possível reconhecer o texto. Preencha os campos manualmente.'}});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
