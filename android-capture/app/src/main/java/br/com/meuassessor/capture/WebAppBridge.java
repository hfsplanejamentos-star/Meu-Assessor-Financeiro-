package br.com.meuassessor.capture;

import android.content.Intent;
import android.provider.Settings;
import android.speech.RecognizerIntent;
import android.webkit.JavascriptInterface;

import java.util.ArrayList;
import java.util.Locale;

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
        return new EncryptedQueueStore(activity).snapshotJson();
    }

    @JavascriptInterface
    public void openNotificationSettings() {
        activity.runOnUiThread(() ->
                activity.startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)));
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
