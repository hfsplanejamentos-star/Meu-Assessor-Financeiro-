const assert = require('assert');
const fs = require('fs');
const read = path => fs.readFileSync(path, 'utf8');
const schema = read('convex/schema.ts');
const http = read('convex/http.ts');
const events = read('convex/notificationEvents.ts');
const finance = read('convex/financeState.ts');

assert.match(schema, /by_owner_and_event_id/);
assert.match(schema, /by_owner_and_fingerprint/);
assert.match(schema, /by_owner_and_received_at/);
assert.match(http, /key\.length < 32/);
assert.match(http, /sha256\(`meu-assessor:v1:/);
assert.doesNotMatch(schema, /syncKey|rawKey/);
assert.match(http, /payload_too_large/);
assert.match(http, /allowedPackages\.has/);
assert.match(http, /OPENAI_API_KEY/);
assert.match(http, /redactForAi/);
assert.match(events, /maxRequests = 30/);
assert.match(events, /withIndex\("by_owner_and_event_id"/);
assert.match(events, /withIndex\("by_owner_and_fingerprint"/);
assert.doesNotMatch(events, /\.filter\(/);
assert.doesNotMatch(events, /\.collect\(/);
assert.match(finance, /internalQuery/);
assert.match(finance, /internalMutation/);
assert.doesNotMatch(finance, /export const \w+ = query\(/);
assert.doesNotMatch(finance, /export const \w+ = mutation\(/);

console.log('AUDITORIA DE SEGURANÇA DO BACKEND: APROVADA');
