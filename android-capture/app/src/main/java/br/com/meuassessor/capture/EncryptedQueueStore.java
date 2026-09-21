package br.com.meuassessor.capture;

import android.content.Context;
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

    private final File file;

    EncryptedQueueStore(Context context) {
        file = new File(context.getFilesDir(), FILE);
    }

    synchronized boolean add(CapturedNotification event) {
        try {
            JSONArray queue = read();

            for (int i = 0; i < queue.length(); i++) {
                if (event.id.equals(
                        queue.getJSONObject(i).optString("id"))) {
                    return false;
                }
            }

            queue.put(event.toJson());

            while (queue.length() > MAX_ITEMS) {
                queue.remove(0);
            }

            write(queue);

            return true;

        } catch (Exception error) {
            return false;
        }
    }

    synchronized int size() {
        try {
            return read().length();
        } catch (Exception ignored) {
            return 0;
        }
    }

    private JSONArray read() throws Exception {

        if (!file.exists()) {
            return new JSONArray();
        }

        FileInputStream input = new FileInputStream(file);
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

        FileOutputStream output =
                new FileOutputStream(file);

        output.write(data);
        output.flush();
        output.close();
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
