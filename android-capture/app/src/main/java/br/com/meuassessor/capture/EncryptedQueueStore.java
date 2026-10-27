package br.com.meuassessor.capture;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.AtomicFile;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.Base64;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

final class EncryptedQueueStore {

    private static final String ALIAS =
            "meu_assessor_notification_queue_v1";

    private static final String FILE =
            "bank_notifications.queue";

    private static final int MAX_ITEMS = 500;

    private static final Object LOCK = new Object();
    private final AtomicFile file;
    private final SharedPreferences replay;
    private String lastAddResult="Não foi possível gravar a fila criptografada";
    String lastAddResult(){return lastAddResult;}

    EncryptedQueueStore(Context context) {
        file = new AtomicFile(new File(context.getFilesDir(), FILE));
        replay = context.getSharedPreferences("capture_acknowledged_v1", Context.MODE_PRIVATE);
    }

    synchronized boolean add(CapturedNotification event) {
        synchronized (LOCK) {
        try {
            lastAddResult="Não foi possível gravar a fila criptografada";
            JSONArray queue = read();
            if (wasAcknowledged(event)){lastAddResult="Já sincronizada; releitura ignorada";return false;}

            for (int i = 0; i < queue.length(); i++) {
                JSONObject prior = queue.getJSONObject(i);
                if (event.id.equals(prior.optString("id")) || sameBankEvent(event, prior)) {
                    lastAddResult="Já está na fila; releitura ignorada";return false;
                }
            }

            if (queue.length() >= MAX_ITEMS){lastAddResult="Fila cheia; sincronize as notificações pendentes";return false;} // Never evict an unreviewed notification.
            queue.put(event.toJson());

            write(queue);
            lastAddResult="Capturada e adicionada à fila";
            return true;

        } catch (Exception error) {
            return false;
        }
    
        }
    }

    private boolean sameBankEvent(CapturedNotification event, JSONObject prior) {
        if (event.amountCents == null || prior.isNull("amountCents")) return false;
        if (event.amountCents.longValue() != prior.optLong("amountCents", Long.MIN_VALUE)) return false;
        if (!safe(event.sourcePackage).equals(safe(prior.optString("sourcePackage")))) return false;
        if (!safe(event.direction).equals(safe(prior.optString("direction")))) return false;

        long priorTime = prior.optLong("postedAt", 0L);
        long delta = Math.abs(event.postedAt - priorTime);
        if (delta > 120000L) return false;

        String current = fingerprint(event.title + " " + event.text);
        String previous = fingerprint(prior.optString("title") + " " + prior.optString("text"));
        return !current.isEmpty() && current.equals(previous);
    }

    private static String safe(String value) {
        return value == null ? "" : value.trim().toLowerCase(java.util.Locale.ROOT);
    }

    private static String fingerprint(String value) {
        if (value == null) return "";
        return value.toLowerCase(java.util.Locale.ROOT)
                .replaceAll("r\\$\\s*\\d+[\\d.]*,\\d{2}", " valor ")
                .replaceAll("\\s+", " ")
                .replaceAll("[^a-z0-9áàâãéêíóôõúç ]", "")
                .trim();
    }

    synchronized boolean acknowledge(String[] ids) {
        synchronized (LOCK) {
        try {
            if (ids == null || ids.length == 0) return true;
            java.util.HashSet<String> wanted = new java.util.HashSet<>();
            for (String id : ids) if (id != null && !id.trim().isEmpty()) wanted.add(id);
            if (wanted.isEmpty()) return true;
            JSONArray queue = read();
            JSONArray kept = new JSONArray();
            for (int i = 0; i < queue.length(); i++) {
                JSONObject item = queue.getJSONObject(i);
                if (!wanted.contains(item.optString("id"))) kept.put(item);
            }
            if (!rememberAcknowledged(queue, wanted)) return false;
            write(kept);
            return true;
        } catch (Exception error) {
            return false;
        }
    
        }
    }

    synchronized int size() {
        synchronized (LOCK) {
        try {
            return read().length();
        } catch (Exception ignored) {
            return 0;
        }
    
        }
    }

    synchronized String snapshotJson() {
        synchronized (LOCK) {
        try {
            return read().toString();
        } catch (Exception ignored) {
            return "[]";
        }
    
        }
    }

    synchronized void clear() {
        synchronized (LOCK) {
            try {
                JSONArray queue = read();
                java.util.HashSet<String> ids = new java.util.HashSet<>();
                for (int i=0;i<queue.length();i++) ids.add(queue.getJSONObject(i).getString("id"));
                if (rememberAcknowledged(queue, ids)) write(new JSONArray());
            } catch (Exception ignored) { /* Keep the queue if durable acknowledgment fails. */ }
        }
    }

    private boolean wasAcknowledged(CapturedNotification event) throws Exception {
        String signature = CaptureReplayGuard.signature(event.sourcePackage,event.direction,event.amountCents,event.title,event.text);
        JSONArray history = new JSONArray(replay.getString("history", "[]"));
        long now = System.currentTimeMillis();
        for (int i=0;i<history.length();i++) {
            JSONObject item=history.getJSONObject(i);
            if (now-item.optLong("seenAt",0L)>CaptureReplayGuard.HISTORY_WINDOW_MS) continue;
            if (CaptureReplayGuard.matches(event.id,signature,event.postedAt,item.optString("id"),item.optString("signature"),item.optLong("postedAt",0L))) return true;
        }
        return false;
    }

    private boolean rememberAcknowledged(JSONArray queue, java.util.Set<String> wanted) throws Exception {
        JSONArray prior=new JSONArray(replay.getString("history","[]")), next=new JSONArray();
        long now=System.currentTimeMillis();
        for (int i=0;i<prior.length();i++) {
            JSONObject item=prior.getJSONObject(i);
            if(now-item.optLong("seenAt",0L)<=CaptureReplayGuard.HISTORY_WINDOW_MS) next.put(item);
        }
        for(int i=0;i<queue.length();i++) {
            JSONObject item=queue.getJSONObject(i);
            if(!wanted.contains(item.optString("id"))) continue;
            Long amount=item.isNull("amountCents")?null:item.getLong("amountCents");
            next.put(new JSONObject().put("id",item.getString("id"))
                    .put("signature",CaptureReplayGuard.signature(item.optString("sourcePackage"),item.optString("direction"),amount,item.optString("title"),item.optString("text")))
                    .put("postedAt",item.optLong("postedAt",0L)).put("seenAt",now));
        }
        while(next.length()>2000) next.remove(0);
        // Metadata only: hashes and timestamps. Commit before removing the encrypted pending events.
        return replay.edit().putString("history",next.toString()).commit();
    }

    private JSONArray read() throws Exception {

        if (!file.getBaseFile().exists() && !new File(file.getBaseFile().getPath()+".bak").exists()) {
            return new JSONArray();
        }

        FileInputStream input = file.openRead();
        ByteArrayOutputStream output = new ByteArrayOutputStream();

        byte[] buffer = new byte[4096];
        int length;

        while ((length = input.read(buffer)) != -1) {
            output.write(buffer, 0, length);
        }

        input.close();

        String wrapper =
                new String(
                        output.toByteArray(),
                        StandardCharsets.UTF_8
                );

        JSONObject encrypted =
                new JSONObject(wrapper);

        byte[] iv =
                Base64.getDecoder().decode(
                        encrypted.getString("iv")
                );

        byte[] payload =
                Base64.getDecoder().decode(
                        encrypted.getString("payload")
                );

        Cipher cipher =
                Cipher.getInstance(
                        "AES/GCM/NoPadding"
                );

        cipher.init(
                Cipher.DECRYPT_MODE,
                key(),
                new GCMParameterSpec(128, iv)
        );

        return new JSONArray(
                new String(
                        cipher.doFinal(payload),
                        StandardCharsets.UTF_8
                )
        );
    }

    private void write(JSONArray queue) throws Exception {

        Cipher cipher =
                Cipher.getInstance(
                        "AES/GCM/NoPadding"
                );

        cipher.init(
                Cipher.ENCRYPT_MODE,
                key()
        );

        byte[] payload =
                cipher.doFinal(
                        queue.toString()
                                .getBytes(StandardCharsets.UTF_8)
                );

        JSONObject wrapper =
                new JSONObject();

        wrapper.put(
                "iv",
                Base64.getEncoder()
                        .encodeToString(cipher.getIV())
        );

        wrapper.put(
                "payload",
                Base64.getEncoder()
                        .encodeToString(payload)
        );

        byte[] data =
                wrapper.toString()
                        .getBytes(StandardCharsets.UTF_8);

        FileOutputStream output = file.startWrite();
        try {
            output.write(data);
            file.finishWrite(output);
        } catch (Exception error) {
            file.failWrite(output);
            throw error;
        }
    }

    private SecretKey key() throws Exception {

        KeyStore store =
                KeyStore.getInstance(
                        "AndroidKeyStore"
                );

        store.load(null);

        if (!store.containsAlias(ALIAS)) {

            KeyGenerator generator =
                    KeyGenerator.getInstance(
                            KeyProperties.KEY_ALGORITHM_AES,
                            "AndroidKeyStore"
                    );

            generator.init(
                    new KeyGenParameterSpec.Builder(
                            ALIAS,
                            KeyProperties.PURPOSE_ENCRYPT
                                    | KeyProperties.PURPOSE_DECRYPT
                    )
                            .setBlockModes(
                                    KeyProperties.BLOCK_MODE_GCM
                            )
                            .setEncryptionPaddings(
                                    KeyProperties.ENCRYPTION_PADDING_NONE
                            )
                            .setKeySize(256)
                            .build()
            );

            generator.generateKey();
        }

        return ((KeyStore.SecretKeyEntry)
                store.getEntry(ALIAS, null))
                .getSecretKey();
    }
}
