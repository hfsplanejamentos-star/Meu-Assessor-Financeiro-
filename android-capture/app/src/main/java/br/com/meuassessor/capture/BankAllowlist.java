package br.com.meuassessor.capture;

import android.content.Context;
import android.content.SharedPreferences;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/**
 * Capture only the four institutions explicitly authorized by the user.
 * Older persisted selections for other banks (including Google Wallet/Pay)
 * are NOT grandfathered in during upgrades.
 */
final class BankAllowlist {
    private static final String PREFS = "capture_preferences";
    private static final String KEY_DISABLED = "disabled_packages";

    private static final Set<String> ALLOWED = new HashSet<>(Arrays.asList(
            "com.c6bank.app",
            "br.com.xp.carteira",
            "com.caju.employee",
            "br.com.itau"
    ));

    static boolean contains(Context context, String packageName) {
        if (packageName == null || !ALLOWED.contains(packageName)) return false;
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        return !prefs.getStringSet(KEY_DISABLED, new HashSet<>()).contains(packageName);
    }

    static boolean isEnabled(Context context, String packageName) {
        return contains(context, packageName);
    }

    static void setEnabled(Context context, String packageName, boolean enabled) {
        if (packageName == null || !ALLOWED.contains(packageName)) return;
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        Set<String> disabled = new HashSet<>(prefs.getStringSet(KEY_DISABLED, new HashSet<>()));
        if (enabled) disabled.remove(packageName);
        else disabled.add(packageName);
        prefs.edit().putStringSet(KEY_DISABLED, disabled).apply();
    }

    static Set<String> packages(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        Set<String> packages = new HashSet<>(ALLOWED);
        packages.removeAll(prefs.getStringSet(KEY_DISABLED, new HashSet<>()));
        return packages;
    }

    private BankAllowlist() {}
}
