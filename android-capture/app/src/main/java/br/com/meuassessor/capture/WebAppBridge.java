package br.com.meuassessor.capture;

import android.content.ComponentName;
import android.content.Intent;
import android.provider.Settings;
import android.speech.RecognizerIntent;
import android.webkit.JavascriptInterface;

import org.json.JSONObject;

final class WebAppBridge {
    private final MainActivity activity;

    WebAppBridge(MainActivity activity) {
        this.activity = activity;
    }

    @JavascriptInterface
    public boolean showFinancialAlert(String key, String title, String text, int severity) {
        if (key == null || !key.matches("[a-z_]{1,64}") || text == null || text.length() > 4000) return false;
        if (android.os.Build.VERSION.SDK_INT >= 33 && activity.checkSelfPermission(
                android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) return false;
        android.app.NotificationManager manager = (android.app.NotificationManager)
                activity.getSystemService(android.content.Context.NOTIFICATION_SERVICE);
        if (manager == null || !manager.areNotificationsEnabled()) return false;
        final String channelId = "snake_financial_alerts";
        if (android.os.Build.VERSION.SDK_INT >= 26) {
            manager.createNotificationChannel(new android.app.NotificationChannel(channelId,
                    "Alertas financeiros", android.app.NotificationManager.IMPORTANCE_HIGH));
            android.app.NotificationChannel channel = manager.getNotificationChannel(channelId);
            if (channel != null && channel.getImportance() == android.app.NotificationManager.IMPORTANCE_NONE) return false;
        }
        String day = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.ROOT).format(new java.util.Date());
        android.content.SharedPreferences sent = activity.getSharedPreferences("financial_alerts_sent", android.content.Context.MODE_PRIVATE);
        if (day.equals(sent.getString(key, ""))) return true;
        android.content.Intent open = new android.content.Intent(activity, MainActivity.class);
        open.setFlags(android.content.Intent.FLAG_ACTIVITY_CLEAR_TOP | android.content.Intent.FLAG_ACTIVITY_SINGLE_TOP);
        android.app.PendingIntent pending = android.app.PendingIntent.getActivity(activity, 0, open,
                android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE);
        android.app.Notification.Builder builder = android.os.Build.VERSION.SDK_INT >= 26
                ? new android.app.Notification.Builder(activity, channelId) : new android.app.Notification.Builder(activity);
        builder.setSmallIcon(activity.getApplicationInfo().icon)
                .setContentTitle("Snake Finance · Atenção").setContentText(text)
                .setStyle(new android.app.Notification.BigTextStyle().bigText(text))
                .setContentIntent(pending).setAutoCancel(true).setOnlyAlertOnce(true)
                .setVisibility(android.app.Notification.VISIBILITY_PRIVATE)
                .setPriority(android.app.Notification.PRIORITY_HIGH);
        try {
            manager.notify("financial:" + key, 9001, builder.build());
            sent.edit().putString(key, day).apply();
            return true;
        } catch (RuntimeException denied) { return false; }
    }

    @JavascriptInterface
    public void reloadDashboard() {
        activity.reloadBundledDashboard();
    }

    @JavascriptInterface
    public void preserveLedgerSnapshot(String ledgerJson) {
        if (ledgerJson == null || ledgerJson.length() < 10) return;
        try {
            org.json.JSONArray rows = new org.json.JSONArray(ledgerJson);
            if (rows.length() == 0) return;
            java.io.File folder = new java.io.File(activity.getFilesDir(), "financial_recovery");
            if (!folder.exists() && !folder.mkdirs()) return;
            java.io.File snapshot = new java.io.File(folder, "ledger_preserved.json");
            // Never overwrite the first nonempty rescue snapshot.
            if (snapshot.exists() && snapshot.length() > 10) return;
            java.io.File temp = new java.io.File(folder, "ledger_preserved.tmp");
            try (java.io.FileOutputStream out = new java.io.FileOutputStream(temp)) {
                out.write(ledgerJson.getBytes(java.nio.charset.StandardCharsets.UTF_8));
                out.getFD().sync();
            }
            if (!temp.renameTo(snapshot)) temp.delete();
        } catch (Exception ignored) { }
    }

    @JavascriptInterface
    public void exportPreservedLedger() {
        try {
            java.io.File file = new java.io.File(new java.io.File(activity.getFilesDir(),
                "financial_recovery"), "ledger_preserved.json");
            if (!file.exists() || file.length() < 10) {
                activity.runOnUiThread(() -> android.widget.Toast.makeText(activity,
                    "Nenhuma cópia interna preservada encontrada", android.widget.Toast.LENGTH_LONG).show());
                return;
            }
            byte[] data = java.nio.file.Files.readAllBytes(file.toPath());
            activity.exportBackupDocument(new String(data, java.nio.charset.StandardCharsets.UTF_8),
                "Snake_Finance_Lancamentos_Preservados.json");
        } catch (Exception e) {
            activity.runOnUiThread(() -> android.widget.Toast.makeText(activity,
                "Falha ao acessar cópia preservada", android.widget.Toast.LENGTH_LONG).show());
        }
    }

    @JavascriptInterface
    public void exportBackup(String json, String filename) {
        if (json == null || json.isEmpty()) {
            activity.runOnUiThread(() -> android.widget.Toast.makeText(activity,
                "Backup vazio: nenhum arquivo foi criado", android.widget.Toast.LENGTH_LONG).show());
            return;
        }
        activity.exportBackupDocument(json, filename);
    }

    @JavascriptInterface
    public int notificationCount() {
        return new EncryptedQueueStore(activity).size();
    }

    @JavascriptInterface
    public String capturedNotifications() {
        return getPendingNotifications();
    }

    @JavascriptInterface
    public String getPendingNotifications() {
        return new EncryptedQueueStore(activity).snapshotJson();
    }

    @JavascriptInterface
    public boolean acknowledgeNotifications(String idsJson) {
        try {
            org.json.JSONArray values = new org.json.JSONArray(idsJson == null ? "[]" : idsJson);
            String[] ids = new String[values.length()];
            for (int i = 0; i < values.length(); i++) ids[i] = values.optString(i, "");
            return new EncryptedQueueStore(activity).acknowledge(ids);
        } catch (Exception ignored) {
            return false;
        }
    }

    @JavascriptInterface
    public void markNotificationsConsumed() {
        new EncryptedQueueStore(activity).clear();
    }

    @JavascriptInterface
    public boolean isNotificationAccessEnabled() {
        String enabled = Settings.Secure.getString(
                activity.getContentResolver(), "enabled_notification_listeners");
        ComponentName component = new ComponentName(activity, BankNotificationListener.class);
        return enabled != null && enabled.contains(component.flattenToString());
    }

    @JavascriptInterface
    public String captureDiagnostics() {
        BankNotificationListener.scrubLegacyDiagnostics(activity);
        android.content.SharedPreferences d = activity.getSharedPreferences(
                BankNotificationListener.DIAG_PREFS, android.content.Context.MODE_PRIVATE);
        try {
            JSONObject out = new JSONObject();
            out.put("packageName", d.getString(BankNotificationListener.KEY_PACKAGE, ""));
            out.put("allowed", d.getBoolean(BankNotificationListener.KEY_ALLOWED, false));
            out.put("financial", d.getBoolean(BankNotificationListener.KEY_FINANCIAL, false));
            out.put("result", d.getString(BankNotificationListener.KEY_RESULT, ""));
            out.put("timestamp", d.getLong(BankNotificationListener.KEY_TIME, 0L));
            out.put("pending", notificationCount());
            out.put("connected", d.getBoolean(BankNotificationListener.KEY_CONNECTED, false));
            out.put("accessEnabled", isNotificationAccessEnabled());
            out.put("recentPackages", d.getString(BankNotificationListener.KEY_RECENT_PACKAGES, ""));
            out.put("title", d.getString(BankNotificationListener.KEY_TITLE, ""));
            out.put("text", d.getString(BankNotificationListener.KEY_TEXT, ""));
            out.put("direction", d.getString(BankNotificationListener.KEY_DIRECTION, ""));
            if (d.contains(BankNotificationListener.KEY_AMOUNT)) out.put("amountCents", d.getLong(BankNotificationListener.KEY_AMOUNT, 0L));
            String pendingJson = new EncryptedQueueStore(activity).snapshotJson();
            org.json.JSONArray pendingItems = new org.json.JSONArray(pendingJson);
            if (pendingItems.length() > 0) {
                JSONObject latest = pendingItems.getJSONObject(pendingItems.length() - 1);
                if (!latest.isNull("reportedBalanceCents")) out.put("reportedBalanceCents", latest.getLong("reportedBalanceCents"));
            }
            return out.toString();
        } catch (Exception ignored) {
            return "{}";
        }
    }

    @JavascriptInterface
    public void openNotificationSettings() {
        openNotificationAccessSettings();
    }

    @JavascriptInterface
    public void openNotificationAccessSettings() {
        activity.runOnUiThread(() ->
                activity.startActivity(new Intent(activity, CaptureSettingsActivity.class)));
    }

    @JavascriptInterface
    public void reconnectNotificationListener() {
        BankNotificationListener.reconnect(activity);
    }

    @JavascriptInterface
    public void openCaptureSettings() {
        activity.runOnUiThread(() ->
                activity.startActivity(new Intent(activity, CaptureSettingsActivity.class)));
    }

    @JavascriptInterface
    public void startVoiceInput() {
        activity.runOnUiThread(() -> {
            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "pt-BR");
            intent.putExtra(RecognizerIntent.EXTRA_PROMPT, "Diga o lançamento financeiro");
            activity.startActivityForResult(intent, MainActivity.REQUEST_VOICE);
        });
    }

    @JavascriptInterface
    public void shareWhatsApp(String text) {
        activity.runOnUiThread(() -> {
            Intent share = new Intent(Intent.ACTION_SEND);
            share.setType("text/plain");
            share.putExtra(Intent.EXTRA_TEXT, text == null ? "" : text);
            share.setPackage("com.whatsapp");
            try {
                activity.startActivity(share);
            } catch (Exception unavailable) {
                share.setPackage(null);
                activity.startActivity(Intent.createChooser(share, "Compartilhar lançamento"));
            }
        });
    }
}



