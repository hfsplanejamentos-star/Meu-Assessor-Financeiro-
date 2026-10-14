const assert = require('assert');
const fs = require('fs');

const read = path => fs.readFileSync(path, 'utf8');
const manifest = read('android-capture/app/src/main/AndroidManifest.xml');
const listener = read('android-capture/app/src/main/java/br/com/meuassessor/capture/BankNotificationListener.java');
const parser = read('android-capture/app/src/main/java/br/com/meuassessor/capture/NotificationParser.java');
const queue = read('android-capture/app/src/main/java/br/com/meuassessor/capture/EncryptedQueueStore.java');
const allowlist = read('android-capture/app/src/main/java/br/com/meuassessor/capture/BankAllowlist.java');

assert.match(manifest, /BIND_NOTIFICATION_LISTENER_SERVICE/);
assert.match(manifest, /android\.permission\.INTERNET/);
assert.match(listener, /BankAllowlist\.contains/);
assert.match(listener, /NotificationParser\.looksFinancial/);
assert.match(parser, /SHA-256/);
assert.match(parser, /amount \+ "\\|" \+ postedAt/);
assert.match(queue, /AES\/GCM\/NoPadding/);
assert.match(queue, /AndroidKeyStore/);
assert.match(queue, /MAX_ITEMS = 500/);
assert.match(queue, /WalletTransactionMatch\\.matches/);
assert.match(manifest, /configChanges="orientation\\|screenSize/);
assert.ok(allowlist.includes('"com.google.android.apps.walletnfcrel"'), 'Google Wallet deve ser permitido');
assert.ok(!allowlist.includes('"com.android.vending"'), 'Google Play Store não é aplicativo de pagamentos autorizado');
assert.match(listener, /Never persist notification title\\/body from unauthorized applications/);
['com.c6bank.app', 'br.com.itau', 'br.com.xp.carteira', 'com.caju.employee'].forEach(pkg =>
  assert.ok(allowlist.includes(`"${pkg}"`), `pacote autorizado ausente: ${pkg}`)
);

console.log('AUDITORIA CAPTURA ANDROID: APROVADA');
