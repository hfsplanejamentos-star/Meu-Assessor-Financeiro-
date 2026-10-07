package br.com.meuassessor.capture;

import android.content.Context;
import android.util.AtomicFile;
import java.util.HashSet;
import java.util.Set;
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

    EncryptedQueueStore(Context context) {
        file = new AtomicFile(new File(context.getFilesDir(), FILE));
    }

    boolean add(CapturedNotification event) {
        synchronized (LOCK) {
            try {
                JSONArray queue = read();
                for (int i = 0; i < queue.length(); i++) {
                    if (event.id.equals(queue.getJSONObject(i).optString("id"))) return false;
                }
                if (queue.length() >= MAX_ITEMS) return false;
                queue.put(event.toJson());
                write(queue);
                return true;
            } catch (Exception error) {
                return false;
            }
        }
    }

    int size() {
        synchronized (LOCK) {
            try { return read().length(); }
            catch (Exception ignored) { return 0; }
        }
    }

    String snapshotJson() {
        synchronized (LOCK) {
            try { return read().toString(); }
            catch (Exception ignored) { return "[]"; }
        }
    }

    void clear() {
        synchronized (LOCK) { file.delete(); }
    }

    boolean acknowledge(String idsJson) {
        synchronized (LOCK) {
            try {
                JSONArray ids = new JSONArray(idsJson);
                if (ids.length() == 0 || ids.length() > MAX_ITEMS) return false;
                Set<String> selected = new HashSet<>();
                for (int i = 0; i < ids.length(); i++) {
                    Object id = ids.get(i);
                    if (!(id instanceof String) || ((String) id).isEmpty() || ((String) id).length() > 256) return false;
                    selected.add((String) id);
                }
                JSONArray queue = read(), remaining = new JSONArray();
                for (int i = 0; i < queue.length(); i++) {
                    JSONObject event = queue.getJSONObject(i);
                    if (!selected.contains(event.getString("id"))) remaining.put(event);
                }
                write(remaining);
                return true;
            } catch (Exception error) { return false; }
        }
    }

    private JSONArray read() throws Exception {

        if (!file.getBaseFile().exists() && !new File(file.getBaseFile().getPath() + ".bak").exists()) {
            return new JSONArray();
        }

        ByteArrayOutputStream output = new ByteArrayOutputStream();
        try (FileInputStream input = file.openRead()) {
            byte[] buffer = new byte[4096];
            int length;
            while ((length = input.read(buffer)) != -1) output.write(buffer, 0, length);
        }

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

        FileOutputStream output = null;
        try {
            output = file.startWrite();
            output.write(data);
            file.finishWrite(output);
        } catch (Exception error) {
            if (output != null) file.failWrite(output);
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
