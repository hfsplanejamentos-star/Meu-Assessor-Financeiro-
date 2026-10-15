package br.com.meuassessor.capture;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.Arrays;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.net.ssl.HttpsURLConnection;
import org.json.JSONObject;

/** Stores only the integration secret in Android Keystore. No token is exposed to JavaScript. */
final class SecureIntegration {
    private static final String PREFS = "snake_secure_integration_v1";
    private static final String ALIAS = "snake_integration_key_v1";
    private static final int MAX_RESPONSE = 1024 * 1024;
    private static final Set<String> PATHS = Set.of(
        "/integrations/status", "/ai/finance", "/whatsapp/messages",
        "/whatsapp/resolve", "/whatsapp/retry");
    private static final ExecutorService NETWORK = Executors.newSingleThreadExecutor();

    private SecureIntegration() {}

    private static String validUrl(String raw) {
        try {
            URI uri = new URI(raw);
            String host = uri.getHost();
            if (!"https".equalsIgnoreCase(uri.getScheme()) || host == null
                    || !host.matches("[a-z0-9-]+\\.convex\\.site")
                    || uri.getUserInfo() != null || uri.getFragment() != null || uri.getQuery() != null
                    || !(uri.getPort() == -1 || uri.getPort() == 443)
                    || !("".equals(uri.getPath()) || "/".equals(uri.getPath()))) return null;
            return "https://" + host;
        } catch (Exception ignored) { return null; }
    }

    private static SecretKey secretKey() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        java.security.Key key = store.getKey(ALIAS, null);
        if (key != null) return (SecretKey) key;
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build());
        return generator.generateKey();
    }

    private static String seal(String plain) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, secretKey());
        byte[] iv = cipher.getIV();
        byte[] encrypted = cipher.doFinal(plain.getBytes(StandardCharsets.UTF_8));
        byte[] combined = Arrays.copyOf(iv, iv.length + encrypted.length);
        System.arraycopy(encrypted, 0, combined, iv.length, encrypted.length);
        return Base64.encodeToString(combined, Base64.NO_WRAP);
    }

    private static String unseal(String encoded) throws Exception {
        byte[] bytes = Base64.decode(encoded, Base64.NO_WRAP);
        if (bytes.length < 28) throw new IllegalArgumentException("Invalid encrypted state");
        byte[] iv = Arrays.copyOfRange(bytes, 0, 12);
        byte[] data = Arrays.copyOfRange(bytes, 12, bytes.length);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, secretKey(), new GCMParameterSpec(128, iv));
        return new String(cipher.doFinal(data), StandardCharsets.UTF_8);
    }

    private static String[] load(Context context) {
        try {
            SharedPreferences preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            String encrypted = preferences.getString("sealed_config", "");
            if (encrypted == null || encrypted.isEmpty()) return null;
            JSONObject json = new JSONObject(unseal(encrypted));
            String url = validUrl(json.optString("url"));
            String key = json.optString("key");
            if (url == null || key.length() < 32 || key.length() > 256) return null;
            return new String[]{url, key};
        } catch (Exception ignored) { return null; }
    }

    static boolean save(Context context, String rawUrl, String key) {
        String url = validUrl(rawUrl);
        if (url == null || key == null || key.length() < 32 || key.length() > 256
                || key.contains("\n") || key.contains("\r")) return false;
        try {
            JSONObject json = new JSONObject().put("url", url).put("key", key);
            return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                    .putString("sealed_config", seal(json.toString())).commit();
        } catch (Exception ignored) { return false; }
    }

    static String config(Context context) {
        String[] saved = load(context);
        try {
            return new JSONObject().put("url", saved == null ? "" : saved[0])
                    .put("configured", saved != null).toString();
        } catch (Exception ignored) { return "{\"url\":\"\",\"configured\":false}"; }
    }

    static boolean clear(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit().remove("sealed_config").commit();
    }

    static void request(MainActivity activity, String requestId, String path, String method, String payload) {
        if (requestId == null || requestId.length() > 120 || path == null
                || !PATHS.contains(path) || !("GET".equals(method) || "POST".equals(method))) {
            send(activity, requestId, 400, "{\"ok\":false,\"error\":\"invalid_request\"}");
            return;
        }
        NETWORK.execute(() -> {
            HttpsURLConnection connection = null;
            int status = 503;
            String response = "{\"ok\":false,\"error\":\"connection_failed\"}";
            try {
                String[] cfg = load(activity);
                if (cfg == null) throw new IllegalStateException("No secured integration");
                URL url = new URL(cfg[0] + path);
                connection = (HttpsURLConnection) url.openConnection();
                // Never forward the owner's X-Sync-Key through HTTP redirects to
                // another host or an unexpected endpoint.
                connection.setInstanceFollowRedirects(false);
                connection.setConnectTimeout(8000);
                connection.setReadTimeout(30000);
                connection.setRequestMethod(method);
                connection.setRequestProperty("X-Sync-Key", cfg[1]);
                connection.setRequestProperty("Accept", "application/json");
                connection.setUseCaches(false);
                if ("POST".equals(method)) {
                    byte[] bytes = (payload == null ? "" : payload).getBytes(StandardCharsets.UTF_8);
                    if (bytes.length > 128_000) throw new IllegalArgumentException("Request too large");
                    connection.setDoOutput(true);
                    connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                    try (java.io.OutputStream out = connection.getOutputStream()) { out.write(bytes); }
                }
                status = connection.getResponseCode();
                InputStream stream = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
                if (stream == null) throw new IllegalStateException("No server response");
                try (InputStream input = stream; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                    byte[] buf = new byte[8192];
                    int n;
                    while ((n = input.read(buf)) != -1) {
                        if (out.size() + n > MAX_RESPONSE) throw new IllegalArgumentException("Response too large");
                        out.write(buf, 0, n);
                    }
                    response = out.toString("UTF-8");
                }
            } catch (Exception ignored) {
                status = 503;
                response = "{\"ok\":false,\"error\":\"connection_failed\"}";
            } finally {
                if (connection != null) connection.disconnect();
                send(activity, requestId, status, response);
            }
        });
    }

    private static void send(MainActivity activity, String id, int status, String body) {
        try {
            JSONObject result = new JSONObject().put("id", id == null ? "" : id)
                    .put("status", status).put("body", body);
            activity.dispatchIntegrationResult(result.toString());
        } catch (Exception ignored) {}
    }
}
