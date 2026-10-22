package br.com.meuassessor.capture;

import android.content.Context;
import android.util.Base64;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.ArrayBlockingQueue;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.net.ssl.HttpsURLConnection;

final class IntegrationClient {
    private static final String ALIAS = "snake_rev0_integration_v1";
    private final MainActivity activity;
    private final android.content.SharedPreferences prefs;
    private final ThreadPoolExecutor network = new ThreadPoolExecutor(1, 1, 30,
            TimeUnit.SECONDS, new ArrayBlockingQueue<>(4));
    private long generation = 0;

    IntegrationClient(MainActivity activity) {
        this.activity = activity;
        this.prefs = activity.getSharedPreferences("integration_private_v1", Context.MODE_PRIVATE);
    }

    private SecretKey key() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        if (store.containsAlias(ALIAS)) return (SecretKey) store.getKey(ALIAS, null);
        KeyGenerator generator = KeyGenerator.getInstance("AES", "AndroidKeyStore");
        generator.init(new android.security.keystore.KeyGenParameterSpec.Builder(ALIAS,
                android.security.keystore.KeyProperties.PURPOSE_ENCRYPT
                | android.security.keystore.KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(android.security.keystore.KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(android.security.keystore.KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true).build());
        return generator.generateKey();
    }

    synchronized boolean save(String url, String credential) {
        String endpoint = IntegrationPolicy.endpoint(url);
        if (endpoint == null || !IntegrationPolicy.validKey(credential)) return false;
        try {
            String plaintext = new JSONObject().put("url", endpoint).put("key", credential).toString();
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key());
            byte[] data = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            boolean saved = prefs.edit().putString("iv", Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP))
                    .putString("data", Base64.encodeToString(data, Base64.NO_WRAP)).commit();
            if (saved) generation++;
            return saved;
        } catch (Exception failure) { return false; }
    }

    private synchronized JSONObject credentials() throws Exception {
        String encrypted = prefs.getString("data", "");
        if (encrypted.isEmpty()) return null;
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128,
                Base64.decode(prefs.getString("iv", ""), Base64.NO_WRAP)));
        return new JSONObject(new String(cipher.doFinal(Base64.decode(encrypted, Base64.NO_WRAP)), StandardCharsets.UTF_8));
    }

    synchronized String config() {
        try {
            JSONObject data = credentials();
            return new JSONObject().put("url", data == null ? "" : data.optString("url"))
                    .put("configured", data != null).toString();
        } catch (Exception failure) { return "{\"url\":\"\",\"configured\":false}"; }
    }

    synchronized boolean clear() {
        boolean cleared = prefs.edit().clear().commit();
        if (cleared) generation++;
        return cleared;
    }

    void request(String id, String path, String method, String body) {
        if (id == null || !id.matches("[A-Za-z0-9_]{1,100}")) return;
        if (!IntegrationPolicy.allowed(path, method) || body == null || body.length() > 100000) {
            deliver(id, 400, "{\"ok\":false,\"error\":\"invalid_request\"}"); return;
        }
        final long requestGeneration;
        final JSONObject requestConfig;
        synchronized (this) {
            requestGeneration = generation;
            try { requestConfig = credentials(); }
            catch (Exception failure) { deliver(id, 401, "{\"error\":\"invalid_sync_key\"}"); return; }
        }
        try {
            network.execute(() -> {
                HttpsURLConnection connection = null;
                try {
                    synchronized (this) {
                        if (generation != requestGeneration) { deliver(id, 409, "{\"error\":\"connection_changed\"}"); return; }
                    }
                    JSONObject config = requestConfig;
                    if (config == null) { deliver(id, 401, "{\"error\":\"invalid_sync_key\"}"); return; }
                    String url = IntegrationPolicy.endpoint(config.optString("url"));
                    if (url == null) throw new IllegalStateException();
                    connection = (HttpsURLConnection) new java.net.URL(url + path).openConnection();
                    connection.setInstanceFollowRedirects(false);
                    connection.setConnectTimeout(10000);
                    connection.setReadTimeout(30000);
                    connection.setRequestMethod(method);
                    connection.setRequestProperty("X-Sync-Key", config.getString("key"));
                    connection.setRequestProperty("Content-Type", "application/json");
                    connection.setRequestProperty("Accept", "application/json");
                    if ("POST".equals(method)) {
                        connection.setDoOutput(true);
                        byte[] data = body.getBytes(StandardCharsets.UTF_8);
                        if (data.length > 100000) throw new java.io.IOException("Request too large");
                        connection.setFixedLengthStreamingMode(data.length);
                        try (java.io.OutputStream out = connection.getOutputStream()) { out.write(data); }
                    }
                    int status = connection.getResponseCode();
                    if (status >= 300 && status < 400) { deliver(id, 502, "{\"error\":\"redirect_blocked\"}"); return; }
                    java.io.InputStream input = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
                    java.io.ByteArrayOutputStream output = new java.io.ByteArrayOutputStream();
                    if (input != null) try (java.io.InputStream stream = input) {
                        byte[] buffer = new byte[4096]; int count;
                        while ((count = stream.read(buffer)) != -1) {
                            if (output.size() + count > 256000) throw new java.io.IOException("Response too large");
                            output.write(buffer, 0, count);
                        }
                    }
                    synchronized (this) {
                        if (generation != requestGeneration) { deliver(id, 409, "{\"error\":\"connection_changed\"}"); return; }
                    }
                    String response = output.toString("UTF-8");
                    if (status == 404) response = "{\"error\":\"service_route_missing\"}";
                    deliver(id, status, response);
                } catch (Exception failure) {
                    deliver(id, 502, "{\"error\":\"connection_failed\"}");
                } finally { if (connection != null) connection.disconnect(); }
            });
        } catch (java.util.concurrent.RejectedExecutionException busy) {
            deliver(id, 429, "{\"error\":\"rate_limited\"}");
        }
    }

    void close() { network.shutdownNow(); }

    private void deliver(String id, int status, String body) {
        try {
            JSONObject result = new JSONObject().put("id", id).put("status", status).put("body", body);
            String encoded = Base64.encodeToString(result.toString().getBytes(StandardCharsets.UTF_8), Base64.NO_WRAP);
            activity.deliverIntegrationResult(encoded);
        } catch (Exception ignored) { }
    }
}
