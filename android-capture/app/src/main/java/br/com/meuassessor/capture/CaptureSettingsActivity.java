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
import android.widget.CheckBox;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.ScrollView;
import android.os.Build;

public final class CaptureSettingsActivity extends Activity {
    private final android.os.Handler handler=new android.os.Handler(android.os.Looper.getMainLooper());
    private final Runnable refreshDiagnostics=new Runnable(){public void run(){refresh();handler.postDelayed(this,1500L);}};
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
        BankNotificationListener.reconnect(this);
        handler.post(refreshDiagnostics);
    }

    @Override protected void onPause(){handler.removeCallbacks(refreshDiagnostics);super.onPause();}

    private void refresh() {
        boolean enabled = listenerEnabled();
        status.setText(enabled ? "Captura ativada" : "Captura desativada");
        status.setTextColor(Color.parseColor(enabled ? "#25E6A7" : "#FFB454"));
        queue.setText("Notificações aguardando sincronização: " + new EncryptedQueueStore(this).size());

        BankNotificationListener.scrubLegacyDiagnostics(this);
        SharedPreferences d = getSharedPreferences(BankNotificationListener.DIAG_PREFS, MODE_PRIVATE);
        String pkg = d.getString(BankNotificationListener.KEY_PACKAGE, "");
        if (pkg == null || pkg.isEmpty()) {
            diagnostic.setText("Diagnóstico: aguardando uma nova notificação");
        } else {
            boolean allowed = d.getBoolean(BankNotificationListener.KEY_ALLOWED, false);
            boolean financial = d.getBoolean(BankNotificationListener.KEY_FINANCIAL, false);
            boolean connected = d.getBoolean(BankNotificationListener.KEY_CONNECTED, false);
            String result = d.getString(BankNotificationListener.KEY_RESULT, "");
            String recent = d.getString(BankNotificationListener.KEY_RECENT_PACKAGES, "");
            String lastTitle = d.getString(BankNotificationListener.KEY_TITLE, "");
            String lastText = d.getString(BankNotificationListener.KEY_TEXT, "");
            String rawPkg = d.getString(BankNotificationListener.KEY_RAW_PACKAGE, "");
            String direction = d.getString(BankNotificationListener.KEY_DIRECTION, "");
            String amount = d.contains(BankNotificationListener.KEY_AMOUNT)
                    ? String.format(java.util.Locale.forLanguageTag("pt-BR"), "R$ %.2f", d.getLong(BankNotificationListener.KEY_AMOUNT,0L)/100.0)
                    : "—";
            String summary = "Serviço conectado: " + (connected ? "SIM" : "NÃO") +
                    "\nÚltimo aplicativo: " + pkg +
                    "\nAplicativo autorizado: " + (allowed ? "SIM" : "NÃO") +
                    "\nFinanceira reconhecida: " + (financial ? "SIM" : "NÃO") +
                    "\nResultado: " + result;
            if (allowed) {
                summary += "\nValor detectado: " + amount +
                        "\nDireção: " + (direction == null || direction.isEmpty() ? "—" : direction) +
                        "\nTítulo: " + (lastTitle == null || lastTitle.isEmpty() ? "—" : lastTitle) +
                        "\nTexto: " + (lastText == null || lastText.isEmpty() ? "—" : lastText);
            } else {
                summary += "\nConteúdo não lido nem armazenado.";
            }
            summary += "\n\nAplicativos recentes:\n" + (recent == null || recent.isEmpty() ? "—" : recent);
            diagnostic.setText(summary);

        }
        String bank=d.getString(BankNotificationListener.KEY_BANK_PACKAGE, "");
        String bankResult=d.getString(BankNotificationListener.KEY_BANK_RESULT, "");
        long bankAt=d.getLong(BankNotificationListener.KEY_BANK_TIME,0L);
        String when=bankAt>0?new java.text.SimpleDateFormat("dd/MM HH:mm:ss",java.util.Locale.forLanguageTag("pt-BR")).format(new java.util.Date(bankAt)):"—";
        diagnostic.append("\n\nÚltimo banco detectado: "+(bank.isEmpty()?"nenhum desde esta atualização":bank)+"\nHorário: "+when+"\nResultado bancário: "+(bankResult.isEmpty()?"aguardando notificação do banco":bankResult));
    }

    private ScrollView buildScreen() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER_HORIZONTAL);
        root.setPadding(dp(24), dp(24), dp(24), dp(24));
        root.setBackgroundColor(Color.parseColor("#061421"));

        TextView title = label("Snake Finance · Captura Android", 24, Color.WHITE);
        status = label("", 20, Color.WHITE);
        queue = label("", 16, Color.parseColor("#B8C7DC"));
        diagnostic = label("", 14, Color.parseColor("#D8E4F2"));
        diagnostic.setGravity(Gravity.START);
        diagnostic.setTextIsSelectable(true);

        Button permission = new Button(this);
        permission.setText("Autorizar acesso às notificações");
        permission.setOnClickListener(v ->
                startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)));

        Button refresh = new Button(this);
        refresh.setText("Recuperar notificações e atualizar diagnóstico");
        refresh.setOnClickListener(v -> {
            BankNotificationListener.reconnect(this);
            refresh();
        });

        TextView privacy = label(
                "Diagnóstico seguro: de aplicativos não autorizados, somente o identificador do pacote é registrado. Conteúdo de notificações não autorizadas não é armazenado.",
                14, Color.parseColor("#91A4BF"));

        root.addView(title, params(24));
        root.addView(status, params(18));
        root.addView(queue, params(18));
        root.addView(diagnostic, params(18));
        root.addView(refresh, params(10));

        TextView banksTitle = label("Bancos monitorados", 18, Color.WHITE);
        root.addView(banksTitle, params(10));
        addBankToggle(root, "C6 Bank", "com.c6bank.app");
        addBankToggle(root, "XP", "br.com.xp.carteira");
        addBankToggle(root, "Caju", "com.caju.employee");
        addBankToggle(root, "Itaú", "br.com.itau");

        root.addView(permission, params(18));
        root.addView(privacy, params(18));
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(Color.parseColor("#061421"));
        scroll.addView(root, new ScrollView.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        if (Build.VERSION.SDK_INT >= 30) getWindow().setDecorFitsSystemWindows(false);
        scroll.setOnApplyWindowInsetsListener((view, insets) -> {
            int left, top, right, bottom;
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(android.view.WindowInsets.Type.systemBars()
                        | android.view.WindowInsets.Type.displayCutout());
                left=bars.left; top=bars.top; right=bars.right; bottom=bars.bottom;
            } else {
                left=insets.getSystemWindowInsetLeft(); top=insets.getSystemWindowInsetTop();
                right=insets.getSystemWindowInsetRight(); bottom=insets.getSystemWindowInsetBottom();
            }
            view.setPadding(left, top, right, bottom);
            return insets;
        });
        scroll.requestApplyInsets();
        return scroll;
    }

    private void addBankToggle(LinearLayout root, String name, String packageName) {
        CheckBox check = new CheckBox(this);
        check.setText(name);
        check.setTextColor(Color.parseColor("#D8E4F2"));
        check.setChecked(BankAllowlist.isEnabled(this, packageName));
        check.setOnCheckedChangeListener((button, enabled) ->
                BankAllowlist.setEnabled(this, packageName, enabled));
        root.addView(check, params(4));
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
