const assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm");
const js=fs.readFileSync("assessor-mobile-screen.js","utf8");
const html=fs.readFileSync("assessor-ia-mobile.html","utf8");
class El {
 constructor(dataset={}) {this.dataset=dataset;this.style={};this.value="";this.textContent="";this.children=[];this.options=[];this.attrs={};this.classList={toggle(name,enabled){}};this.scrollHeight=100;this.disabled=false;}
 addEventListener(){}replaceChildren(...x){this.options=x;this.children=x}append(...x){this.children.push(...x)}
 add(x){this.options.push(x)}appendChild(x){this.children.push(x)}insertBefore(x){this.children.push(x)}
 setAttribute(k,v){this.attrs[k]=String(v)}getAttribute(k){return this.attrs[k]||null}
 showModal(){this.open=true}close(){this.open=false}querySelectorAll(){return []}querySelector(){return null}
}
const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,new El());return nodes.get(id)};
const quick=["dourado","limao","branco"].map(t=>new El({themeShortcut:t}));
const dialogs=["dourado","limao","branco"].map(t=>new El({themeOption:t}));
const metas=[new El()];
const body={dataset:{theme:"dourado"}};
const document={body,getElementById:get,createElement:()=>new El(),addEventListener(){},
 querySelectorAll(q){if(q==="[data-theme-shortcut]")return quick;if(q==="[data-theme-option]")return dialogs;if(q==='meta[name="theme-color"]')return metas;return[]},
 querySelector(){return new El()}};
const store=new Map(),localStorage={getItem:key=>store.get(key)||null,setItem:(k,v)=>store.set(k,v)};
const window={localStorage,scrollTo(){},SnakeAssessorApi:{hasSyncKey:()=>false}};
vm.runInNewContext(js,{window,document,localStorage,Option:function(t,v){this.textContent=t;this.value=v},setTimeout:()=>1,clearTimeout(){},console});
assert(html.includes('class="assessor-theme-dots"'));
assert.deepEqual(quick.map(x=>x.attrs["aria-pressed"]),["true","false","false"]);
quick[1].onclick();
assert.equal(body.dataset.theme,"limao");
assert.equal(store.get("snake_assessor_theme"),"limao");
assert.deepEqual(quick.map(x=>x.attrs["aria-pressed"]),["false","true","false"]);
quick[2].onclick();
assert.equal(body.dataset.theme,"branco");
assert.equal(metas[0].attrs.content,"#eff3f5");
dialogs[0].onclick();
assert.equal(body.dataset.theme,"dourado");
assert.deepEqual(quick.map(x=>x.attrs["aria-pressed"]),["true","false","false"]);
get("menuBtn").onclick();
assert.equal(get("settingsDialog").open,true);
console.log("Assessor theme switches: gold/lime/white, persistent state, header and settings selection PASS");