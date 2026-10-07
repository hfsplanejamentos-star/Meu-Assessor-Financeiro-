package br.com.meuassessor.capture;

import android.content.ComponentName;
import android.content.Intent;
import android.provider.Settings;
import android.speech.RecognizerIntent;
import android.webkit.JavascriptInterface;

import org.json.JSONObject;

final class WebAppBridge {
    private final MainActivity activity;

    WebAppBridge(MainActivity activity) {
        this.activity = activity;
    }

    @JavascriptInterface
    public int notificationCount() {
        return new EncryptedQueueStore(activity).size();
    }

    @JavascriptInterface
    public String capturedNotifications() {
        return getPendingNotifications();
    }

    @JavascriptInterface
    public String getPendingNotifications() {
        return new EncryptedQueueStore(activity).snapshotJson();
    }

    @JavascriptInterface
    public boolean acknowledgeNotifications(String idsJson) {
        try {
            org.json.JSONArray values = new org.json.JSONArray(idsJson == null ? "[]" : idsJson);
            String[] ids = new String[values.length()];
            for (int i = 0; i < values.length(); i++) ids[i] = values.optString(i, "");
            return new EncryptedQueueStore(activity).acknowledge(ids);
        } catch (Exception ignored) {
            return false;
        }
    }

    @JavascriptInterface
    public void markNotificationsConsumed() {
        new EncryptedQueueStore(activity).clear();
    }

    @JavascriptInterface
    public boolean isNotificationAccessEnabled() {
        String enabled = Settings.Secure.getString(
                activity.getContentResolver(), "enabled_notification_listeners");
        ComponentName component = new ComponentName(activity, BankNotificationListener.class);
        return enabled != null && enabled.contains(component.flattenToString());
    }

    @JavascriptInterface
    public String captureDiagnostics() {
        android.content.SharedPreferences d = activity.getSharedPreferences(
                BankNotificationListener.DIAG_PREFS, android.content.Context.MODE_PRIVATE);
        try {
            JSONObject out = new JSONObject();
            out.put("packageName", d.getString(BankNotificationListener.KEY_PACKAGE, ""));
            out.put("allowed", d.getBoolean(BankNotificationListener.KEY_ALLOWED, false));
            out.put("financial", d.getBoolean(BankNotificationListener.KEY_FINANCIAL, false));
            out.put("result", d.getString(BankNotificationListener.KEY_RESULT, ""));
            out.put("timestamp", d.getLong(BankNotificationListener.KEY_TIME, 0L));
            out.put("pending", notificationCount());
            out.put("connected", d.getBoolean(BankNotificationListener.KEY_CONNECTED, false));
            out.put("accessEnabled", isNotificationAccessEnabled());
            out.put("recentPackages", d.getString(BankNotificationListener.KEY_RECENT_PACKAGES, ""));
            out.put("title", d.getString(BankNotificationListener.KEY_TITLE, ""));
            out.put("text", d.getString(BankNotificationListener.KEY_TEXT, ""));
            out.put("direction", d.getString(BankNotificationListener.KEY_DIRECTION, ""));
            if (d.contains(BankNotificationListener.KEY_AMOUNT)) out.put("amountCents", d.getLong(BankNotificationListener.KEY_AMOUNT, 0L));
            String pendingJson = new EncryptedQueueStore(activity).snapshotJson();
            org.json.JSONArray pendingItems = new org.json.JSONArray(pendingJson);
            if (pendingItems.length() > 0) {
                JSONObject latest = pendingItems.getJSONObject(pendingItems.length() - 1);
                if (!latest.isNull("reportedBalanceCents")) out.put("reportedBalanceCents", latest.getLong("reportedBalanceCents"));
            }
            return out.toString();
        } catch (Exception ignored) {
            return "{}";
        }
    }

    @JavascriptInterface
    public void openNotificationSettings() {
        openNotificationAccessSettings();
    }

    @JavascriptInterface
    public void openNotificationAccessSettings() {
        activity.runOnUiThread(() ->
                activity.startActivity(new Intent(activity, CaptureSettingsActivity.class)));
    }

    @JavascriptInterface
    public void reconnectNotificationListener() {
        BankNotificationListener.reconnect(activity);
    }

    @JavascriptInterface
    public void openCaptureSettings() {
        activity.runOnUiThread(() ->
                activity.startActivity(new Intent(activity, CaptureSettingsActivity.class)));
    }

    @JavascriptInterface
    public void startVoiceInput() {
        activity.runOnUiThread(() -> {
            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "pt-BR");
            intent.putExtra(RecognizerIntent.EXTRA_PROMPT, "Diga o lançamento financeiro");
            activity.startActivityForResult(intent, MainActivity.REQUEST_VOICE);
        });
    }

    @JavascriptInterface
    public void shareWhatsApp(String text) {
        activity.runOnUiThread(() -> {
            Intent share = new Intent(Intent.ACTION_SEND);
            share.setType("text/plain");
            share.putExtra(Intent.EXTRA_TEXT, text == null ? "" : text);
            share.setPackage("com.whatsapp");
            try {
                activity.startActivity(share);
            } catch (Exception unavailable) {
                share.setPackage(null);
                activity.startActivity(Intent.createChooser(share, "Compartilhar lançamento"));
            }
        });
    }
}
