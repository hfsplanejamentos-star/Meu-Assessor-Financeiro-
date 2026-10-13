const assert = require("node:assert/strict");
const fs = require("node:fs");
const read = path => fs.readFileSync(path, "utf8");
const prefix = "android-capture/app/src/main/java/br/com/meuassessor/capture/";
const manifest = read("android-capture/app/src/main/AndroidManifest.xml");
const listener = read(prefix+"BankNotificationListener.java");
const parser = read(prefix+"NotificationParser.java");
const queue = read(prefix+"EncryptedQueueStore.java");
const allowlist = read(prefix+"BankAllowlist.java");
const settings = read(prefix+"CaptureSettingsActivity.java");
const bridge = read(prefix+"WebAppBridge.java");
const backend = read("convex/http.ts");
const tests = read("android-capture/app/src/test/java/br/com/meuassessor/capture/NotificationParserTest.java");

assert.match(manifest,/BIND_NOTIFICATION_LISTENER_SERVICE/);
assert.match(manifest,/android\.permission\.INTERNET/); // finance sync uses HTTPS

const block = allowlist.match(/new HashSet<>\(Arrays\.asList\(([\s\S]*?)\)\)/);
assert(block,"bank allowlist constants must exist");
const banks = [...block[1].matchAll(/"([^"]+)"/g)].map(m=>m[1]).sort();
assert.deepEqual(banks,["br.com.itau","br.com.xp.carteira","com.c6bank.app","com.caju.employee"]);
assert.doesNotMatch(allowlist,/allowed_packages|value\.contains|value\.startsWith|merged\.addAll\(saved\)/,
 "old saved permissions or substring guesses must not broaden the capture allowlist");
assert.match(allowlist,/if \(packageName == null \|\| !ALLOWED\.contains\(packageName\)\) return false/);
assert.match(allowlist,/if \(packageName == null \|\| !ALLOWED\.contains\(packageName\)\) return;/);

const toggles=[...settings.matchAll(/addBankToggle\(root,\s*"[^"]+",\s*"([^"]+)"\)/g)].map(m=>m[1]).sort();
assert.deepEqual(toggles,banks,"only the four approved bank switches should appear");
assert.doesNotMatch(settings,/addBankToggle\(root,\s*"Google Wallet"/);
const allowIndex = listener.indexOf("boolean allowed=BankAllowlist.contains(this,pkg)");
const notificationReadIndex=listener.indexOf("Notification n=status.getNotification()");
const textReadIndex=listener.indexOf("title=first(e,Notification.EXTRA_TITLE");
assert(allowIndex>=0 && allowIndex<notificationReadIndex && allowIndex<textReadIndex,
 "reject unauthorized packages before reading notification content");
assert.match(listener,/if\(!allowed\)\{/);
assert.match(listener,/saveDiagnostic\(pkg,false,false,"Ignorada: aplicativo não autorizado","",""/);
assert.match(listener,/\.remove\(KEY_RAW_TITLE\)\.remove\(KEY_RAW_TEXT\)/);
assert.match(listener,/status\.getPostTime\(\),status\.getKey\(\)/);
assert.match(settings,/if \(!BankAllowlist\.contains\(this, rawPkg\)\)/);

assert.match(parser,/MessageDigest\.getInstance\("SHA-256"\)/);
assert.match(parser,/String stableKey = notificationKey == null \? "" : notificationKey/);
assert.match(parser,/stableKey \+ "\|" \+ postedAt/);
assert.doesNotMatch(parser,/postedAt \/ 60_000L/);
assert.match(tests,/assertNotEquals\(one\.id, two\.id\)/);
assert.match(tests,/assertEquals\(one\.id, retry\.id\)/);

assert.match(queue,/AES\/GCM\/NoPadding/);
assert.match(queue,/AndroidKeyStore/);
assert.match(queue,/MAX_ITEMS = 500/);
assert.match(queue,/if \(event\.id\.equals\(prior\.optString\("id"\)\)\)/);
assert.doesNotMatch(queue,/sameBankEvent|String current = fingerprint/);
assert.match(queue,/synchronized int pruneUnauthorized\(Context context\)/);
assert.match(queue,/BankAllowlist\.contains\(context, item\.optString\("sourcePackage", ""\)\)/);
assert.match(bridge,/private EncryptedQueueStore authorizedQueue\(\)/);
assert.match(bridge,/return queue == null \? "\[\]" : queue\.snapshotJson\(\)/);
assert.match(bridge,/getPendingNotifications\(\)/);

const backendBlock=backend.match(/const allowedPackages = new Set\(\[([\s\S]*?)\]\);/);
assert(backendBlock);
assert.deepEqual([...backendBlock[1].matchAll(/"([^"]+)"/g)].map(m=>m[1]).sort(),banks,
 "Android and Convex must authorize the exact same four package IDs");
console.log("AUDITORIA CAPTURA ANDROID: quatro bancos, privacidade e identificadores únicos APROVADOS");
