package br.com.meuassessor.capture;

import android.app.Activity;
import android.content.Context;
import android.widget.Toast;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.security.MessageDigest;
import java.util.HashSet;
import java.util.Set;

/**
 * Immutable, local, full financial backup captured before ledger migrations.
 * Runs entirely inside the signed Android app sandbox; never posts values to a server.
 * Retains the FIRST verified nonempty snapshot instead of silently replacing it.
 */
final class FinancialRecoveryVault {
    private static final String FILE = "original_full_financial_backup.json";
    private static final int MAX_BYTES = 20 * 1024 * 1024;
    private static final int MIN_BYTES = 80;

    private FinancialRecoveryVault() {}

    private static File file(Context context) {
        File directory = new File(context.getFilesDir(), "financial_recovery");
        return new File(directory, FILE);
    }

    private static boolean valid(byte[] data) {
        if (data == null || data.length < MIN_BYTES || data.length > MAX_BYTES) return false;
        try {
            JSONObject root = new JSONObject(new String(data, StandardCharsets.UTF_8));
            if (!"snake-finance-backup".equals(root.optString("schema"))
                    || root.optInt("version", 0) != 2) return false;
            JSONArray ledger = root.optJSONArray("ledger");
            JSONObject settings = root.optJSONObject("storage");
            if (ledger == null || ledger.length() < 1 || ledger.length() > 100000
                    || settings == null) return false;
            String opening = settings.optString("assessor_opening_v82", "");
            JSONObject balances = new JSONObject(opening);
            if (!balances.has("c6") || !balances.has("caju")
                    || !balances.has("cajuFunds")
                    || !(balances.opt("c6") instanceof Number)
                    || !(balances.opt("caju") instanceof Number)
                    || !(balances.opt("cajuFunds") instanceof Number)) return false;
            Set<String> ids = new HashSet<>();
            for (int i = 0; i < ledger.length(); i++) {
                JSONObject row = ledger.optJSONObject(i);
                if (row == null || !row.has("id") || !row.has("v")
                        || !row.has("d") || !row.has("a") || !row.has("t") || !row.has("s")) return false;
                Object id = row.opt("id");
                if (!(id instanceof Number) || !ids.add(String.valueOf(id))) return false;
                Object amount = row.opt("v");
                if (!(amount instanceof Number)) return false;
            }
            return true;
        } catch (Exception ignored) { return false; }
    }

    static synchronized boolean preserve(Context context, String json) {
        if (json == null || json.length() > MAX_BYTES) return false;
        byte[] data = json.getBytes(StandardCharsets.UTF_8);
        if (!valid(data)) return false;
        File target = file(context);
        try {
            if (target.isFile()) {
                // Never overwrite the first valid original. If an old file exists but
                // fails integrity validation, reject automatically and request manual review.
                return valid(Files.readAllBytes(target.toPath()));
            }
            File dir = target.getParentFile();
            if (dir == null || (!dir.isDirectory() && !dir.mkdirs())) return false;
            File temp = new File(dir, FILE + ".tmp");
            try (FileOutputStream stream = new FileOutputStream(temp)) {
                stream.write(data);
                stream.flush();
                stream.getFD().sync();
            }
            byte[] reread = Files.readAllBytes(temp.toPath());
            if (!MessageDigest.isEqual(
                    MessageDigest.getInstance("SHA-256").digest(data),
                    MessageDigest.getInstance("SHA-256").digest(reread))
                    || !valid(reread)) {
                temp.delete();
                return false;
            }
            if (!temp.renameTo(target)) {
                temp.delete();
                return false;
            }
            return true;
        } catch (Exception ignored) { return false; }
    }

    static String status(Context context) {
        File saved = file(context);
        try {
            if (!saved.isFile()) return new JSONObject()
                    .put("available", false).put("valid", false).toString();
            byte[] data = Files.readAllBytes(saved.toPath());
            boolean ok = valid(data);
            JSONObject info = new JSONObject().put("available", true)
                    .put("valid", ok).put("bytes", data.length);
            if (ok) info.put("entries", new JSONObject(
                    new String(data, StandardCharsets.UTF_8))
                    .getJSONArray("ledger").length());
            return info.toString();
        } catch (Exception ignored) { return "{\"available\":false,\"valid\":false}"; }
    }

    static void export(MainActivity activity) {
        try {
            File target = file(activity);
            if (!target.isFile()) throw new IllegalStateException("Cópia completa não encontrada");
            byte[] data = Files.readAllBytes(target.toPath());
            if (!valid(data)) throw new IllegalStateException("Cópia incompleta ou inválida");
            // MainActivity writes via ACTION_CREATE_DOCUMENT and verifies SHA-256 readback.
            activity.exportBackupDocument(new String(data, StandardCharsets.UTF_8),
                    "Snake_Finance_Base_Original_Preservada.json");
        } catch (Exception e) {
            activity.runOnUiThread(() -> Toast.makeText(activity,
                    "Resgate completo: " + e.getMessage(), Toast.LENGTH_LONG).show());
        }
    }
}
