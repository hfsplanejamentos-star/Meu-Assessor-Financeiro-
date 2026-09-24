package br.com.meuassessor.capture;

import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Executors;

final class UpdateChecker {
    private static final String METADATA_URL =
            "https://hfsplanejamentos-star.github.io/Meu-Assessor-Financeiro-/android-version.json";
    private static final String CHANNEL_ID = "app_updates";
    private static final int NOTIFICATION_ID = 1200;
    private static final long CHECK_INTERVAL_MS = 6L * 60L * 60L * 1000L;

    private UpdateChecker() {}

    static void check(Activity activity) {
        long last = activity.getPreferences(Activity.MODE_PRIVATE)
                .getLong("last_update_check", 0L);
        if (System.currentTimeMillis() - last < CHECK_INTERVAL_MS) return;
        activity.getPreferences(Activity.MODE_PRIVATE).edit()
                .putLong("last_update_check", System.currentTimeMillis()).apply();

        Executors.newSingleThreadExecutor().execute(() -> {
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) new URL(
                        METADATA_URL + "?t=" + System.currentTimeMillis()).openConnection();
                connection.setConnectTimeout(8000);
                connection.setReadTimeout(8000);
                connection.setRequestProperty("Accept", "application/json");
                connection.setRequestProperty("Cache-Control", "no-cache");
                if (connection.getResponseCode() != HttpURLConnection.HTTP_OK) return;

                StringBuilder json = new StringBuilder();
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                        connection.getInputStream(), StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null) json.append(line);
                }

                JSONObject metadata = new JSONObject(json.toString());
                int latestCode = metadata.optInt("versionCode", 0);
                if (latestCode <= BuildConfig.VERSION_CODE) return;

                String latestName = metadata.optString("versionName", "nova versão");
                String notes = metadata.optString("notes", "Há uma atualização disponível.");
                String downloadUrl = metadata.optString("downloadUrl",
                        "https://github.com/hfsplanejamentos-star/Meu-Assessor-Financeiro-/releases/latest");
                notifyUpdate(activity, latestName, notes, downloadUrl);
            } catch (Exception ignored) {
                // A falta de conexão nunca impede o uso do dashboard.
            } finally {
                if (connection != null) connection.disconnect();
            }
        });
    }

    private static void notifyUpdate(
            Activity activity, String versionName, String notes, String downloadUrl) {
        NotificationManager manager = activity.getSystemService(NotificationManager.class);
        if (manager == null) return;

        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Atualizações do aplicativo", NotificationManager.IMPORTANCE_DEFAULT);
        channel.setDescription("Avisos quando uma nova versão do Meu Assessor estiver disponível");
        manager.createNotificationChannel(channel);

        Intent openDownload = new Intent(Intent.ACTION_VIEW, Uri.parse(downloadUrl));
        PendingIntent pending = PendingIntent.getActivity(
                activity, 0, openDownload,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification notification = new Notification.Builder(activity, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.stat_sys_download_done)
                .setContentTitle("Atualização do Meu Assessor disponível")
                .setContentText("Versão " + versionName + " — toque para atualizar")
                .setStyle(new Notification.BigTextStyle().bigText(notes))
                .setContentIntent(pending)
                .setAutoCancel(true)
                .build();
        manager.notify(NOTIFICATION_ID, notification);
    }
}
