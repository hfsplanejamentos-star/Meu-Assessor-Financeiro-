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
  b.innerHTML='<img src="'+url+'" alt="Comprovante selecionado" style="width:100%;max-height:300px;object-fit:contain;border-radius:14px;background:#030b16"><div class="notice" style="margin-top:12px">Imagem selecionada. A leitura inteligente sera ativada quando o servico de IA/visao estiver configurado. Por seguranca, nenhum lancamento e salvo sem sua confirmacao.</div><div class="form-grid" style="margin-top:12px"><div class="field"><label>Tipo</label><select id="imgType"><option value="expense">Despesa</option><option value="income">Receita</option></select></div><div class="field"><label>Valor</label><input id="imgValue" inputmode="decimal" placeholder="0,00"></div><div class="field"><label>Data</label><input id="imgDate" type="date"></div><div class="field"><label>Descricao</label><input id="imgDesc" placeholder="Ex.: Pix, mercado, parcela..."></div><div class="field"><label>Categoria</label><input id="imgCat" placeholder="Categoria"></div><div class="field"><label>Conta de origem/destino</label><input id="imgAccount" placeholder="C6, Caju, XP..."></div></div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="secondary" id="imgCancel">Cancelar</button><button class="primary" id="imgConfirm">Revisar e incluir</button></div>';
  document.getElementById('imgDate').value=new Date().toISOString().slice(0,10);
  document.getElementById('imgCancel').onclick=()=>{m.classList.remove('open');URL.revokeObjectURL(url)};
  document.getElementById('imgConfirm').onclick=()=>{
   const val=Number(String(document.getElementById('imgValue').value).replace(/\./g,'').replace(',','.'));
   if(!Number.isFinite(val)||val<=0){alert('Informe o valor para confirmar o lancamento.');return}
   const type=document.getElementById('imgType').value,tx={id:'img_'+Date.now(),date:document.getElementById('imgDate').value,desc:document.getElementById('imgDesc').value.trim()||'Lancamento por imagem',cat:document.getElementById('imgCat').value.trim()||(type==='income'?'Receitas':'Outros'),sub:'Imagem',value:type==='expense'?-Math.abs(val):Math.abs(val),status:'realized',source:'Imagem',origin:document.getElementById('imgAccount').value.trim()||'Imagem'};
   if(!window.db||!Array.isArray(window.db.transactions)){alert('Base financeira ainda nao esta pronta.');return}
   window.db.transactions.push(tx); try{window.save?.()}catch(_){}
   document.dispatchEvent(new CustomEvent('finance-data-changed',{detail:{source:'image-entry',id:tx.id}}));
   m.classList.remove('open');URL.revokeObjectURL(url); alert('Lancamento incluido e confirmado.');
  };
  m.classList.add('open');
 }
 function install(){
  ensureUI();
  const menus=[...document.querySelectorAll('.fab-menu')];
  menus.forEach(menu=>{if(menu.querySelector('[data-image-entry]'))return;const b=document.createElement('button');b.type='button';b.className='fab-action';b.dataset.imageEntry='1';b.innerHTML='<span>Adicionar por imagem</span><i>▣</i>';b.onclick=()=>launch('gallery');menu.appendChild(b)});
  window.MeuAssessorImageEntry={gallery:()=>launch('gallery'),camera:()=>launch('camera')};
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
