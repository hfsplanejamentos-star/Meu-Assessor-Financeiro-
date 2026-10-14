package br.com.meuassessor.capture;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Restore the local reminder schedule after reboot or in-place APK update. */
public final class ReminderBootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action)
                || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            DailyFinanceReminder.schedule(context);
        }
    }
}
