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
assert.match(http, /com\.google\.android\.apps\.walletnfcrel/);
assert.doesNotMatch(http, /com\.nu\.production|com\.android\.vending|com\.santander\.app/);
assert.match(events, /if \(byId\)/);
assert.match(events, /possibleDuplicateOf/);
assert.doesNotMatch(events, /if \(byId \|\| byFingerprint\)/);
assert.match(http, /OPENAI_API_KEY/);
assert.match(http, /redactForAi/);
assert.match(events, /maxRequests = 30/);
assert.match(events, /withIndex\("by_owner_and_event_id"/);
assert.match(events, /withIndex\("by_owner_and_fingerprint"/);
assert.doesNotMatch(events, /\.filter\(/);
assert.doesNotMatch(events, /\.collect\(/);
assert.match(finance, /internalQuery/);
assert.match(finance, /internalMutation/);
assert.match(finance, /args\.baseVersion === undefined/);
assert.match(finance, /current\.version !== args\.baseVersion/);
assert.doesNotMatch(finance, /export const \w+ = query\(/);
assert.doesNotMatch(finance, /export const \w+ = mutation\(/);

// The OpenAI endpoint must not be usable with arbitrary fake 32-char strings.
assert.match(http, /SNAKE_ACCESS_KEY/);
assert.match(http, /key !== expected/);

// Meta Cloud API requires verified signature and an explicitly authorized sender.
const whatsapp = read('convex/whatsapp.ts');
assert.match(schema, /whatsappMessages:/);
assert.match(schema, /by_owner_and_message_id/);
assert.match(http, /validMetaSignature/);
assert.match(http, /x-hub-signature-256/);
assert.match(http, /WHATSAPP_APP_SECRET/);
assert.match(http, /WHATSAPP_VERIFY_TOKEN/);
assert.match(http, /WHATSAPP_ALLOWED_FROM/);
assert.match(http, /return new Response\("Forbidden", \{ status: 403 \}\)/);
assert.match(http, /\/whatsapp\/webhook/);
assert.match(http, /\/whatsapp\/resolve/);
assert.match(http, /\/whatsapp\/retry/);
assert.match(http, /\/integrations\/status/);
assert.match(whatsapp, /internalMutation/);
assert.match(whatsapp, /internalAction/);
assert.match(whatsapp, /transcribeAudio/);
assert.match(whatsapp, /status: "pending"/);
assert.doesNotMatch(whatsapp, /financeState\.save|persistLedger|accountBalance/);

// Native auth material must stay encrypted in Android Keystore (never HTML/localStorage).
const bridge = read('android-capture/app/src/main/java/br/com/meuassessor/capture/WebAppBridge.java');
const secure = read('android-capture/app/src/main/java/br/com/meuassessor/capture/SecureIntegration.java');
assert.match(bridge, /saveIntegrationConfig/);
assert.match(bridge, /integrationRequest/);
assert.match(secure, /AndroidKeyStore/);
assert.match(secure, /AES\/GCM\/NoPadding/);
assert.match(secure, /HttpsURLConnection/);
assert.match(secure, /convex/);

// Signed update must be manually released without replacing or deleting the existing APK.
const releaseWorkflow = read('.github/workflows/publish-signed-android-release.yml');
assert.doesNotMatch(releaseWorkflow, /gh release delete/);
assert.match(releaseWorkflow, /workflow_dispatch:/);
assert.match(releaseWorkflow, /SIGNING CERTIFICATE CHANGED/);
assert.match(releaseWorkflow, /versionCode > 31/);

console.log('AUDITORIA DE SEGURANÇA DO BACKEND: APROVADA');
