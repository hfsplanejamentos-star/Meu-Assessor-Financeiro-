package br.com.meuassessor.capture;

import android.app.Notification;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

public final class BankNotificationListener extends NotificationListenerService {
    @Override
    public void onNotificationPosted(StatusBarNotification status) {
        if (status == null || !BankAllowlist.contains(this, status.getPackageName())) return;
        Notification notification = status.getNotification();
        if (notification == null) return;
        Bundle extras = notification.extras;
        String title = text(extras.getCharSequence(Notification.EXTRA_TITLE));
        String body = text(extras.getCharSequence(Notification.EXTRA_BIG_TEXT));
        if (body.isEmpty()) body = text(extras.getCharSequence(Notification.EXTRA_TEXT));
        if (!NotificationParser.looksFinancial(title, body)) return;
        CapturedNotification event = NotificationParser.parse(status.getPackageName(), title, body, status.getPostTime());
        new EncryptedQueueStore(this).add(event);
    }

    private static String text(CharSequence value) {
        return value == null ? "" : value.toString();
    }
}
