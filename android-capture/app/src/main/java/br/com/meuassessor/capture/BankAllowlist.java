package br.com.meuassessor.capture;

import android.content.Context;
import android.content.SharedPreferences;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

final class BankAllowlist {
    private static final String PREFS = "capture_preferences";
    private static final String KEY = "allowed_packages";
    private static final Set<String> DEFAULTS = new HashSet<>(Arrays.asList(
            "com.c6bank.app",
            "br.com.itau",
            "br.com.xp.carteira",
            "com.caju.employee"
    ));

    static boolean contains(Context context, String packageName) {
        return packages(context).contains(packageName);
    }

    static Set<String> packages(Context context) {
        SharedPreferences preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        return new HashSet<>(preferences.getStringSet(KEY, DEFAULTS));
    }

    private BankAllowlist() {}
}
