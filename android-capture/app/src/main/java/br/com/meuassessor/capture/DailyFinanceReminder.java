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
 * Private notification entry points for briefings. They never invent balances:
 * financial amounts are calculated only when the user opens the authenticated WebView.
 */
public final class DailyFinanceReminder extends BroadcastReceiver {
    private static final String CHANNEL = "snake_finance_daily_v1";
    private static final String EXTRA_PERIOD = "period";
    private static final int MORNING = 1108;
    private static final int EVENING = 1109;
    private static final int WEEKLY = 1110;

    public static void schedule(Context context) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) return;
        scheduleOne(context, alarms, MORNING, 8, 0, Calendar.DAY_OF_WEEK, 0);
        scheduleOne(context, alarms, EVENING, 20, 0, Calendar.DAY_OF_WEEK, 0);
        scheduleOne(context, alarms, WEEKLY, 9, 0, Calendar.SUNDAY, 7);
    }

    private static void scheduleOne(Context context, AlarmManager alarms,
                                    int requestCode, int hour, int minute, int dayOfWeek, int days) {
        Intent intent = new Intent(context, DailyFinanceReminder.class);
        intent.putExtra(EXTRA_PERIOD, requestCode);
        PendingIntent pending = PendingIntent.getBroadcast(context, requestCode, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Calendar next = Calendar.getInstance();
        next.set(Calendar.HOUR_OF_DAY, hour);
        next.set(Calendar.MINUTE, minute);
        next.set(Calendar.SECOND, 0);
        next.set(Calendar.MILLISECOND, 0);
        if (days > 0) next.set(Calendar.DAY_OF_WEEK, dayOfWeek);
        if (next.getTimeInMillis() <= System.currentTimeMillis())
            next.add(Calendar.DAY_OF_MONTH, days > 0 ? 7 : 1);
        alarms.setInexactRepeating(AlarmManager.RTC_WAKEUP, next.getTimeInMillis(),
                days > 0 ? AlarmManager.INTERVAL_DAY * 7 : AlarmManager.INTERVAL_DAY, pending);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        if (Build.VERSION.SDK_INT >= 33
                && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) return;
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(CHANNEL,
                    "Briefings financeiros", NotificationManager.IMPORTANCE_DEFAULT);
            channel.setDescription("Abertura, fechamento diário e resumo semanal do Snake Finance");
            channel.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);
            manager.createNotificationChannel(channel);
        }
        int period = intent == null ? MORNING : intent.getIntExtra(EXTRA_PERIOD, MORNING);
        if (period != MORNING && period != EVENING && period != WEEKLY) return;
        Intent open = new Intent(context, MainActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent action = PendingIntent.getActivity(context, period, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        String title = period == EVENING ? "Snake Finance · Fechamento do dia"
                : period == WEEKLY ? "Snake Finance · Resumo semanal"
                : "Snake Finance · Briefing da manhã";
        String body = period == EVENING ? "Confira o realizado, o saldo e os compromissos de amanhã."
                : period == WEEKLY ? "Revise despesas, metas e compromissos da nova semana."
                : "Veja saldo disponível, próximos vencimentos e quanto pode gastar.";
        Notification.Builder builder = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(context, CHANNEL) : new Notification.Builder(context);
        builder.setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(title)
                .setContentText(body)
                .setVisibility(Notification.VISIBILITY_PRIVATE)
                .setAutoCancel(true)
                .setContentIntent(action);
        manager.notify(period, builder.build());
    }
}
