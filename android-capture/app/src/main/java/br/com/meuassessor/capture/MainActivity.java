package br.com.meuassessor.capture;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.provider.Settings;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public final class MainActivity extends Activity {
    private TextView status;
    private TextView queue;
    private TextView diagnostic;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        setContentView(buildScreen());
    }

    @Override
    protected void onResume() {
        super.onResume();
        refresh();
    }

    private void refresh() {
        boolean enabled = listenerEnabled();
        status.setText(enabled ? "Captura ativada" : "Captura desativada");
        status.setTextColor(Color.parseColor(enabled ? "#25E6A7" : "#FFB454"));
        queue.setText("Notificações aguardando sincronização: " + new EncryptedQueueStore(this).size());

        SharedPreferences d = getSharedPreferences(BankNotificationListener.DIAG_PREFS, MODE_PRIVATE);
        String pkg = d.getString(BankNotificationListener.KEY_PACKAGE, "");
        if (pkg == null || pkg.isEmpty()) {
            diagnostic.setText("Diagnóstico: aguardando uma nova notificação");
        } else {
            boolean allowed = d.getBoolean(BankNotificationListener.KEY_ALLOWED, false);
            boolean financial = d.getBoolean(BankNotificationListener.KEY_FINANCIAL, false);
            String result = d.getString(BankNotificationListener.KEY_RESULT, "");
            diagnostic.setText(
                    "Último pacote: " + pkg +
                    "\nAplicativo autorizado: " + (allowed ? "SIM" : "NÃO") +
                    "\nFinanceira reconhecida: " + (financial ? "SIM" : "NÃO") +
                    "\nResultado: " + result
            );
        }
    }

    private LinearLayout buildScreen() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER_HORIZONTAL);
        root.setPadding(dp(24), dp(48), dp(24), dp(24));
        root.setBackgroundColor(Color.parseColor("#061421"));

        TextView title = label("Meu Assessor · Captura Android", 24, Color.WHITE);
        status = label("", 20, Color.WHITE);
        queue = label("", 16, Color.parseColor("#B8C7DC"));
        diagnostic = label("", 15, Color.parseColor("#D8E4F2"));

        Button permission = new Button(this);
        permission.setText("Autorizar acesso às notificações");
        permission.setOnClickListener(v ->
                startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)));

        Button refresh = new Button(this);
        refresh.setText("Atualizar diagnóstico");
        refresh.setOnClickListener(v -> refresh());

        TextView privacy = label(
                "Diagnóstico seguro: de aplicativos não autorizados, somente o identificador do pacote é registrado. Conteúdo de notificações não autorizadas não é armazenado.",
                14, Color.parseColor("#91A4BF"));

        root.addView(title, params(24));
        root.addView(status, params(18));
        root.addView(queue, params(18));
        root.addView(diagnostic, params(18));
        root.addView(refresh, params(10));
        root.addView(permission, params(18));
        root.addView(privacy, params(18));
        return root;
    }

    private boolean listenerEnabled() {
        String enabled = Settings.Secure.getString(
                getContentResolver(), "enabled_notification_listeners");
        ComponentName component = new ComponentName(this, BankNotificationListener.class);
        return enabled != null && enabled.contains(component.flattenToString());
    }

    private TextView label(String text, int sp, int color) {
        TextView view = new TextView(this);
        view.setText(text);
        view.setTextSize(sp);
        view.setTextColor(color);
        view.setGravity(Gravity.CENTER);
        return view;
    }

    private LinearLayout.LayoutParams params(int bottom) {
        LinearLayout.LayoutParams value = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT);
        value.setMargins(0, 0, 0, dp(bottom));
        return value;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
