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
    public void reloadDashboard() {
        activity.reloadDashboard();
    }

    @JavascriptInterface
    public void exportBackup(String json, String filename) {
        activity.exportBackup(json, filename);
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

    /** Acknowledge only reviewed events; keep newly arrived notifications. */
    @JavascriptInterface
    public boolean acknowledgeNotifications(String idsJson) {
        boolean saved=new EncryptedQueueStore(activity).acknowledge(idsJson);
        if(saved)CaptureNotice.update(activity);
        return saved;
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
    @JavascriptInterface
    public String getIntegrationConfig(){return new IntegrationStore(activity).publicConfig();}
    @JavascriptInterface
    public boolean saveIntegrationConfig(String url,String key){return new IntegrationStore(activity).save(url,key);}
    @JavascriptInterface
    public boolean clearIntegrationConfig(){return new IntegrationStore(activity).clear();}

    private static final java.util.concurrent.ThreadPoolExecutor REQUESTS = new java.util.concurrent.ThreadPoolExecutor(2,2,30,java.util.concurrent.TimeUnit.SECONDS,new java.util.concurrent.ArrayBlockingQueue<>(8));
    @JavascriptInterface
    public void integrationRequest(String requestId,String path,String method,String body){
        if(requestId==null || !requestId.matches("[a-zA-Z0-9_-]{1,80}"))return;
        if(!IntegrationEndpoint.allows(path,method) || body==null || body.getBytes(java.nio.charset.StandardCharsets.UTF_8).length>32000){reply(requestId,400,"{\"error\":\"invalid_request\"}");return;}
        try{REQUESTS.execute(()->{
            java.net.HttpURLConnection connection=null;
            try{
                JSONObject cfg=new IntegrationStore(activity).read();String endpoint=IntegrationEndpoint.normalize(cfg.optString("url"));String key=cfg.optString("key");
                if(endpoint==null || key.length()<32){reply(requestId,503,"{\"error\":\"not_connected\"}");return;}
                connection=(java.net.HttpURLConnection)new java.net.URL(endpoint+path).openConnection();
                connection.setInstanceFollowRedirects(false);connection.setConnectTimeout(10000);connection.setReadTimeout(35000);connection.setRequestMethod(method);
                connection.setRequestProperty("X-Sync-Key",key);connection.setRequestProperty("Accept","application/json");
                if("POST".equals(method)){connection.setDoOutput(true);connection.setRequestProperty("Content-Type","application/json");try(java.io.OutputStream out=connection.getOutputStream()){out.write(body.getBytes(java.nio.charset.StandardCharsets.UTF_8));}}
                int status=connection.getResponseCode();java.io.InputStream stream=status>=400?connection.getErrorStream():connection.getInputStream();
                java.io.ByteArrayOutputStream output=new java.io.ByteArrayOutputStream();
                if(stream!=null)try(java.io.InputStream input=stream){byte[] buffer=new byte[4096];int count;while((count=input.read(buffer))!=-1){if(output.size()+count>256000)throw new java.io.IOException("Response too large");output.write(buffer,0,count);}}
                reply(requestId,status,output.toString(java.nio.charset.StandardCharsets.UTF_8.name()));
            }catch(Exception error){reply(requestId,502,"{\"error\":\"connection_failed\"}");}finally{if(connection!=null)connection.disconnect();}
        });}catch(java.util.concurrent.RejectedExecutionException busy){reply(requestId,429,"{\"error\":\"rate_limited\"}");}
    }
    private void reply(String id,int status,String body){
        try{JSONObject result=new JSONObject().put("id",id).put("status",status).put("body",body);activity.dispatchIntegrationResult(result.toString());}catch(Exception ignored){}
    }

}
