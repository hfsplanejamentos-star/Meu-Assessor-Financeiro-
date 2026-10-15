'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=path=>fs.readFileSync(path,'utf8');

const manifest=read('android-capture/app/src/main/AndroidManifest.xml');
const main=read('android-capture/app/src/main/java/br/com/meuassessor/capture/MainActivity.java');
const listener=read('android-capture/app/src/main/java/br/com/meuassessor/capture/BankNotificationListener.java');
const parser=read('android-capture/app/src/main/java/br/com/meuassessor/capture/NotificationParser.java');
const queue=read('android-capture/app/src/main/java/br/com/meuassessor/capture/EncryptedQueueStore.java');
const allowlist=read('android-capture/app/src/main/java/br/com/meuassessor/capture/BankAllowlist.java');
const secure=read('android-capture/app/src/main/java/br/com/meuassessor/capture/SecureIntegration.java');
const bridge=read('android-capture/app/src/main/java/br/com/meuassessor/capture/WebAppBridge.java');
const gradle=read('android-capture/app/build.gradle.kts');

assert.match(manifest,/BIND_NOTIFICATION_LISTENER_SERVICE/);
assert.match(manifest,/android\.permission\.INTERNET/);
assert.match(manifest,/android:usesCleartextTraffic="false"/);
assert.match(manifest,/android:allowBackup="false"/);
assert.match(listener,/BankAllowlist\.contains/);
assert.match(listener,/NotificationParser\.looksFinancial/);
assert.ok(listener.indexOf('boolean allowed=BankAllowlist.contains') <
  listener.indexOf('saveRawDiagnostic(pkg,title,body'),'Unauthorized notification content must not be saved');
assert.match(parser,/SHA-256/);
assert.match(parser,/\+ postedAt\)/);
assert.doesNotMatch(parser,/postedAt \/ 60_000L/);
assert.match(queue,/AES\/GCM\/NoPadding/);
assert.match(queue,/AndroidKeyStore/);
assert.match(queue,/MAX_ITEMS = 500/);
assert.match(queue,/possibleDuplicateOf/);
['com.c6bank.app','br.com.itau','br.com.xp.carteira','com.caju.employee',
 'com.google.android.apps.walletnfcrel'].forEach(pkg=>{
  assert.ok(allowlist.includes('"' + pkg + '"'),'Missing approved source: '+pkg);
});
assert.match(allowlist,/com\.android\.vending/);
assert.match(secure,/AndroidKeyStore/);
assert.match(secure,/HttpsURLConnection/);
assert.match(secure,/setInstanceFollowRedirects\(false\)/);
assert.match(secure,/AES\/GCM\/NoPadding/);
assert.match(secure,/PATHS = Set\.of/);
assert.match(bridge,/saveIntegrationConfig/);
assert.match(bridge,/integrationRequest/);
assert.match(main,/path\.startsWith\("\/Meu-Assessor-Financeiro-\/"\)/);
assert.match(main,/new Intent\(Intent\.ACTION_VIEW, uri\)/);
assert.match(main,/bundledDashboard\.contains\("v85-landscape-responsive"\)/);
assert.match(gradle,/applicationIdSuffix = "\.qa"/);
assert.match(gradle,/applicationId = "br\.com\.snakefinance\.app"/);

console.log('PASS Android: bank allowlist, privacy, exact event identity, secure integration, app origin and QA isolation');
