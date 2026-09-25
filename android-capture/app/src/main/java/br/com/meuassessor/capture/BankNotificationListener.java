package br.com.meuassessor.capture;

import android.app.Notification;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.ComponentName;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

public final class BankNotificationListener extends NotificationListenerService {
    static final String DIAG_PREFS = "capture_diagnostics";
    static final String KEY_PACKAGE = "last_package";
    static final String KEY_ALLOWED = "last_allowed";
    static final String KEY_FINANCIAL = "last_financial";
    static final String KEY_RESULT = "last_result";
    static final String KEY_TIME = "last_time";
    static final String KEY_CONNECTED = "listener_connected";
    static final String KEY_RECENT_PACKAGES = "recent_packages";

    @Override
    public void onListenerConnected() {
        super.onListenerConnected();
        getSharedPreferences(DIAG_PREFS, Context.MODE_PRIVATE).edit()
                .putBoolean(KEY_CONNECTED, true)
                .putString(KEY_RESULT, "Serviço conectado e aguardando notificação")
                .putLong(KEY_TIME, System.currentTimeMillis())
                .apply();
    }

    @Override
    public void onListenerDisconnected() {
        super.onListenerDisconnected();
        getSharedPreferences(DIAG_PREFS, Context.MODE_PRIVATE).edit()
                .putBoolean(KEY_CONNECTED, false)
                .putString(KEY_RESULT, "Serviço desconectado; solicitando reconexão")
                .putLong(KEY_TIME, System.currentTimeMillis())
                .apply();
        requestRebind(new ComponentName(this, BankNotificationListener.class));
    }

    @Override
    public void onNotificationPosted(StatusBarNotification status) {
        if (status == null) return;

        String packageName = status.getPackageName();
        rememberPackage(packageName);
        boolean allowed = BankAllowlist.contains(this, packageName);

        // Privacy: for non-authorized apps, record ONLY the package name/status.
        if (!allowed) {
            saveDiagnostic(packageName, false, false, "Ignorada: aplicativo não autorizado");
            return;
        }

        Notification notification = status.getNotification();
        if (notification == null) {
            saveDiagnostic(packageName, true, false, "Ignorada: notificação sem conteúdo");
            return;
        }

        Bundle extras = notification.extras;
        String title = text(extras.getCharSequence(Notification.EXTRA_TITLE));
        String body = text(extras.getCharSequence(Notification.EXTRA_BIG_TEXT));
        if (body.isEmpty()) body = text(extras.getCharSequence(Notification.EXTRA_TEXT));

        boolean financial = NotificationParser.looksFinancial(title, body);
        if (!financial) {
            saveDiagnostic(packageName, true, false, "Ignorada: padrão financeiro não reconhecido");
            return;
        }

        CapturedNotification event =
                NotificationParser.parse(packageName, title, body, status.getPostTime());
        boolean added = new EncryptedQueueStore(this).add(event);
        saveDiagnostic(packageName, true, true,
                added ? "Capturada e adicionada à fila" : "Reconhecida, mas já existente/erro de fila");
    }

    private void rememberPackage(String packageName) {
        if (packageName == null || packageName.isEmpty()) return;
        SharedPreferences prefs = getSharedPreferences(DIAG_PREFS, Context.MODE_PRIVATE);
        String old = prefs.getString(KEY_RECENT_PACKAGES, "");
        java.util.LinkedHashSet<String> items = new java.util.LinkedHashSet<>();
        items.add(packageName);
        if (old != null && !old.isEmpty()) {
            for (String item : old.split("\\n")) if (!item.isEmpty()) items.add(item);
        }
        StringBuilder out = new StringBuilder();
        int count = 0;
        for (String item : items) {
            if (count++ >= 12) break;
            if (out.length() > 0) out.append('\n');
            out.append(item);
        }
        prefs.edit().putString(KEY_RECENT_PACKAGES, out.toString()).apply();
    }

    static void reconnect(Context context) {
        requestRebind(new ComponentName(context, BankNotificationListener.class));
    }

    private void saveDiagnostic(String packageName, boolean allowed, boolean financial, String result) {
        getSharedPreferences(DIAG_PREFS, Context.MODE_PRIVATE).edit()
                .putString(KEY_PACKAGE, packageName == null ? "" : packageName)
                .putBoolean(KEY_ALLOWED, allowed)
                .putBoolean(KEY_FINANCIAL, financial)
                .putString(KEY_RESULT, result)
                .putLong(KEY_TIME, System.currentTimeMillis())
                .apply();
    }

    private static String text(CharSequence value) {
        return value == null ? "" : value.toString();
    }
}
