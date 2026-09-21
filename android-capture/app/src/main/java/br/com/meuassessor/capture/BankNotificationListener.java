package br.com.meuassessor.capture;

import android.app.Notification;
import android.content.Context;
import android.content.SharedPreferences;
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

    @Override
    public void onNotificationPosted(StatusBarNotification status) {
        if (status == null) return;

        String packageName = status.getPackageName();
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
