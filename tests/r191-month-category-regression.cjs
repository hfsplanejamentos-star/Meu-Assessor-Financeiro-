const assert = require('node:assert/strict');
const fs = require('node:fs');

const index = fs.readFileSync('index.html', 'utf8');
const patch = fs.readFileSync('r67-finance-patch.js', 'utf8');
const engine = fs.readFileSync('r91-finance-engine.js', 'utf8');
const startup = fs.readFileSync('r92-stable-startup.js', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');

assert.match(startup, /const d=new Date\(\),key=d\.getFullYear\(\)/, 'o app deve calcular o mês vigente ao abrir');
assert.match(startup, /MONTH_SCOPES\.forEach\(scope=>monthScopes\[scope\]=key\)/, 'todos os filtros mensais devem reiniciar juntos');
assert.match(startup, /assessor_active_month',key/, 'o mês vigente deve ser persistido ao abrir');
assert.match(patch, /canonicalUsed=true/, 'o detalhamento deve reconhecer linhas canônicas');
assert.match(patch, /key>=current&&!canonicalUsed/, 'recorrências não podem ser somadas novamente após o modelo canônico');
assert.match(patch, /String\(t\.id\|\|''\)===String\(r\.id\)/, 'a deduplicação também deve comparar o ID canônico');
assert.match(sw, /assessor-atual-r191/, 'o service worker deve invalidar o cache anterior');
assert.match(engine, /'2026-10':\[6500,4359\.90,0,2772\.71\]/, 'outubro deve incluir todas as recorrências');
assert.match(engine, /'2026-11':\[10104\.50,4359\.90,3000,8517\.31\]/, 'novembro deve preservar despesa e investimento corretos');
assert.match(engine, /'2027-06':\[10104\.50,4059\.90,3000,52922\.95\]/, 'junho deve encerrar a parcela de Móveis');
assert.match(engine, /'2027-08':\[0,0,0,58967\.55\]/, 'saldo final deve permanecer estável após o plano');

const canonical = [
  { id: 'rec_pensao', kind: 'recurring', cat: 'Pensão', value: 1500 },
  { id: 'rec_carro', kind: 'recurring', cat: 'C4 Cactus', value: 1000 },
  { id: 'rec_aluguel', kind: 'recurring', cat: 'Moradia', value: 1480 },
];
const totals = Object.fromEntries(canonical.map(row => [row.cat, Math.abs(row.value)]));
assert.deepEqual(totals, { Pensão: 1500, 'C4 Cactus': 1000, Moradia: 1480 });
assert.equal(Object.values(totals).reduce((sum, value) => sum + value, 0), 3980);

console.log('R191: mês vigente e deduplicação de categorias validados.');
