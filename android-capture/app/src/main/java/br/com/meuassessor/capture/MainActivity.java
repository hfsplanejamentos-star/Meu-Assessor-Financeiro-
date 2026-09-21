package br.com.meuassessor.capture;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.provider.Settings;
import android.text.TextUtils;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public final class MainActivity extends Activity {
    private TextView status;
    private TextView queue;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        setContentView(buildScreen());
    }

    @Override
    protected void onResume() {
        super.onResume();
        boolean enabled = listenerEnabled();
        status.setText(enabled ? "Captura ativada" : "Captura desativada");
        status.setTextColor(Color.parseColor(enabled ? "#25E6A7" : "#FFB454"));
        queue.setText("Notificações aguardando sincronização: " + new EncryptedQueueStore(this).size());
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
        TextView privacy = label("Somente notificações financeiras dos aplicativos autorizados são processadas. A fila permanece criptografada neste aparelho.", 15, Color.parseColor("#91A4BF"));
        Button permission = new Button(this);
        permission.setText("Autorizar acesso às notificações");
        permission.setOnClickListener(v -> startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)));

        root.addView(title, params(24));
        root.addView(status, params(18));
        root.addView(queue, params(18));
        root.addView(permission, params(18));
        root.addView(privacy, params(18));
        return root;
    }

    private boolean listenerEnabled() {
        String enabled = Settings.Secure.getString(getContentResolver(), "enabled_notification_listeners");
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
        LinearLayout.LayoutParams value = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        value.setMargins(0, 0, 0, dp(bottom));
        return value;
    }

    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
}
