package br.com.meuassessor.capture;

import android.content.Context;
import android.content.SharedPreferences;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

final class BankAllowlist {
    private static final String PREFS = "capture_preferences";
    private static final String KEY = "allowed_packages";
    private static final String KEY_DISABLED = "disabled_packages";

    /*
     * Allowlist inicial de bancos, carteiras e apps de pagamento.
     * O listener ainda exige que NotificationParser reconheça valor +
     * linguagem financeira antes de gravar qualquer evento.
     *
     * O diagnóstico seguro permite descobrir packageNames adicionais
     * sem armazenar o conteúdo de notificações de apps não autorizados.
     */
    private static final Set<String> DEFAULTS = new HashSet<>(Arrays.asList(
            // Instituições expressamente autorizadas para uso padrão.
            "com.c6bank.app",
            "br.com.xp.carteira",
            "com.caju.employee",
            "br.com.itau",
            // Google Wallet/Pay: fonte auxiliar; sempre revisar antes de registrar.
            "com.google.android.apps.walletnfcrel"
    ));

    static boolean contains(Context context, String packageName) {
        if (packageName == null) return false;
        // Google Play Store não é carteira de pagamentos: nunca capturar.
        // Também impede que uma instalação antiga a mantenha nos pacotes salvos.
        if ("com.android.vending".equals(packageName)) return false;
        SharedPreferences preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (preferences.getStringSet(KEY_DISABLED, new HashSet<>()).contains(packageName)) return false;
        if (DEFAULTS.contains(packageName)) return true;
        String value = packageName.toLowerCase(java.util.Locale.ROOT);
        // Bancos alteram packageName entre versões, marcas e módulos de Pix.
        // A leitura ainda só é persistida quando o parser confirma valor + ação financeira.
        return value.contains("c6bank") || value.contains("c6.bank")
                || value.contains("xpinc") || value.contains("xp.invest")
                || value.startsWith("br.com.xp") || value.startsWith("com.xp")
                || value.contains("caju") || value.contains("itau");
    }

    static boolean isEnabled(Context context, String packageName) {
        if (packageName == null) return false;
        SharedPreferences preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        return contains(context, packageName)
                && !preferences.getStringSet(KEY_DISABLED, new HashSet<>()).contains(packageName);
    }

    static void setEnabled(Context context, String packageName, boolean enabled) {
        SharedPreferences preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        Set<String> disabled = new HashSet<>(preferences.getStringSet(KEY_DISABLED, new HashSet<>()));
        if (enabled) disabled.remove(packageName);
        else disabled.add(packageName);
        preferences.edit().putStringSet(KEY_DISABLED, disabled).apply();
    }

    static Set<String> packages(Context context) {
        SharedPreferences preferences =
                context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);

        Set<String> saved = preferences.getStringSet(KEY, null);
        if (saved == null || saved.isEmpty()) {
            Set<String> defaults = new HashSet<>(DEFAULTS);
            defaults.removeAll(preferences.getStringSet(KEY_DISABLED, new HashSet<>()));
            return defaults;
        }

        // Migração: mantém escolhas existentes e incorpora os novos padrões.
        Set<String> merged = new HashSet<>(DEFAULTS);
        for (String candidate : saved) {
            if (DEFAULTS.contains(candidate)) merged.add(candidate);
        }
        Set<String> disabled = preferences.getStringSet(KEY_DISABLED, new HashSet<>());
        merged.removeAll(disabled);
        return merged;
    }

    private BankAllowlist() {}
}
