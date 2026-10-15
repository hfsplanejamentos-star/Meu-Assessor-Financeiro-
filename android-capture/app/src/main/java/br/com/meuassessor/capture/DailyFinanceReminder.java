package br.com.meuassessor.capture;

import android.Manifest;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import java.util.Calendar;

/**
 * Two local daily prompts for the Snake Finance daily review.
 * They do NOT claim access to the actual financial ledger while the app is closed.
 */
public final class DailyFinanceReminder extends BroadcastReceiver {
    private static final String CHANNEL = "snake_finance_daily_v1";
    private static final String EXTRA_PERIOD = "finance_period";
    private static final String MORNING = "morning";
    private static final String EVENING = "evening";
    private static final int MORNING_REQUEST = 1108;
    private static final int EVENING_REQUEST = 1109;

    public static void schedule(Context context) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) return;
        schedulePeriod(context, alarms, MORNING, MORNING_REQUEST, 8, 0);
        schedulePeriod(context, alarms, EVENING, EVENING_REQUEST, 20, 0);
    }

    private static void schedulePeriod(Context context, AlarmManager alarms,
                                       String period, int request, int hour, int minute) {
        Intent intent = new Intent(context, DailyFinanceReminder.class).putExtra(EXTRA_PERIOD, period);
        PendingIntent pending = PendingIntent.getBroadcast(context, request, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Calendar next = Calendar.getInstance();
        next.set(Calendar.HOUR_OF_DAY, hour);
        next.set(Calendar.MINUTE, minute);
        next.set(Calendar.SECOND, 0);
        next.set(Calendar.MILLISECOND, 0);
        if (next.getTimeInMillis() <= System.currentTimeMillis()) next.add(Calendar.DAY_OF_MONTH, 1);
        // Inexact alarms are permitted without special alarm privileges.
        // Android battery management may delay delivery.
        alarms.setInexactRepeating(AlarmManager.RTC_WAKEUP, next.getTimeInMillis(),
                AlarmManager.INTERVAL_DAY, pending);
    }

    @Override public void onReceive(Context context, Intent intent) {
        if (Build.VERSION.SDK_INT >= 33 &&
                context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                        != PackageManager.PERMISSION_GRANTED) return;
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(CHANNEL,
                    "Revisões financeiras diárias", NotificationManager.IMPORTANCE_DEFAULT);
            channel.setDescription("Lembrete matinal e fechamento noturno no Snake Finance");
            manager.createNotificationChannel(channel);
        }
        boolean evening = intent != null && EVENING.equals(intent.getStringExtra(EXTRA_PERIOD));
        String title = evening ? "Snake Finance · Fechamento do dia" : "Snake Finance · Briefing financeiro";
        String message = evening
                ? "Revise gastos realizados, notificações pendentes e saldo após o dia."
                : "Confira vencimentos, orçamento disponível, metas e compromissos.";
        Intent open = new Intent(context, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int request = evening ? EVENING_REQUEST : MORNING_REQUEST;
        PendingIntent action = PendingIntent.getActivity(context, request, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder builder = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(context, CHANNEL) : new Notification.Builder(context);
        builder.setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(title)
                .setContentText(message)
                .setAutoCancel(true).setContentIntent(action);
        manager.notify(request, builder.build());
    }
}
