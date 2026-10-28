package br.com.meuassessor.capture;

import android.app.Notification;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.ComponentName;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import java.util.ArrayList;

public final class BankNotificationListener extends NotificationListenerService {
    static final String DIAG_PREFS="capture_diagnostics", KEY_PACKAGE="last_package", KEY_ALLOWED="last_allowed",
            KEY_FINANCIAL="last_financial", KEY_RESULT="last_result", KEY_TIME="last_time",
            KEY_CONNECTED="listener_connected", KEY_RECENT_PACKAGES="recent_packages",
            KEY_TITLE="last_title", KEY_TEXT="last_text", KEY_AMOUNT="last_amount", KEY_DIRECTION="last_direction",
            KEY_REPORTED_BALANCE="last_reported_balance", KEY_RAW_PACKAGE="last_raw_package", KEY_RAW_TITLE="last_raw_title", KEY_RAW_TEXT="last_raw_text", KEY_RAW_TIME="last_raw_time";

    static final String KEY_BANK_PACKAGE="bank_package", KEY_BANK_RESULT="bank_result", KEY_BANK_TIME="bank_time";
    private static volatile java.lang.ref.WeakReference<BankNotificationListener> active = new java.lang.ref.WeakReference<>(null);
    private volatile boolean connected;

    @Override public void onListenerConnected() {
        super.onListenerConnected();
        connected=true; active=new java.lang.ref.WeakReference<>(this);
        scrubLegacyDiagnostics(this);
        getSharedPreferences(DIAG_PREFS,Context.MODE_PRIVATE).edit().putBoolean(KEY_CONNECTED,true)
                .putString(KEY_RESULT,"Serviço conectado e aguardando notificação").putLong(KEY_TIME,System.currentTimeMillis()).apply();
        recoverActiveNotifications();
    }
    @Override public void onListenerDisconnected() {
        super.onListenerDisconnected();
        connected=false; active=new java.lang.ref.WeakReference<>(null);
        getSharedPreferences(DIAG_PREFS,Context.MODE_PRIVATE).edit().putBoolean(KEY_CONNECTED,false)
                .putString(KEY_RESULT,"Serviço desconectado; solicitando reconexão").putLong(KEY_TIME,System.currentTimeMillis()).apply();
        requestRebind(new ComponentName(this,BankNotificationListener.class));
    }
    @Override public void onDestroy() {
        connected=false;
        if(active.get()==this)active=new java.lang.ref.WeakReference<>(null);
        getSharedPreferences(DIAG_PREFS,Context.MODE_PRIVATE).edit().putBoolean(KEY_CONNECTED,false).apply();
        super.onDestroy();
    }
    private void recoverActiveNotifications() {
        if(!connected)return;
        try {
            StatusBarNotification[] notifications=getActiveNotifications();
            if(notifications==null)return;
            java.util.Arrays.sort(notifications,java.util.Comparator.comparingLong(StatusBarNotification::getPostTime));
            long now=System.currentTimeMillis();
            for(StatusBarNotification item:notifications) {
                // Do not inspect content of other apps, summaries or old notifications.
                if(item!=null&&BankAllowlist.contains(this,item.getPackageName())&&CaptureReplayGuard.canRecover(item.getPostTime(),now))onNotificationPosted(item);
            }
        } catch (RuntimeException error) {
            getSharedPreferences(DIAG_PREFS,Context.MODE_PRIVATE).edit().putString(KEY_BANK_RESULT,"Não foi possível consultar notificações visíveis; confira a permissão de acesso").apply();
        }
    }
    @Override public void onNotificationPosted(StatusBarNotification status) {
        if(status==null)return;
        String pkg=status.getPackageName(); rememberPackage(pkg);
        saveRawDiagnostic(pkg, "", "", status.getPostTime());
        boolean allowed=BankAllowlist.contains(this,pkg);
        if(!allowed){saveDiagnostic(pkg,false,false,"Ignorada: aplicativo não autorizado","","",null,null,"");return;}
        Notification n=status.getNotification();
        String title="",body="";
        if(n!=null){
            Bundle e=n.extras == null ? Bundle.EMPTY : n.extras;
            title=first(e,Notification.EXTRA_TITLE,Notification.EXTRA_TITLE_BIG);
            body=joinUnique(
                    text(e.getCharSequence(Notification.EXTRA_BIG_TEXT)),
                    text(e.getCharSequence(Notification.EXTRA_TEXT)),
                    text(e.getCharSequence(Notification.EXTRA_SUB_TEXT)),
                    text(e.getCharSequence(Notification.EXTRA_INFO_TEXT)),
                    lines(e.getCharSequenceArray(Notification.EXTRA_TEXT_LINES))
            );
        }
        if(n==null){saveDiagnostic(pkg,true,false,"Ignorada: notificação sem conteúdo",title,body,null,null,"");return;}
        if((n.flags&Notification.FLAG_GROUP_SUMMARY)!=0){saveDiagnostic(pkg,true,false,"Resumo agrupado ignorado; aguardando notificações individuais","","",null,null,"");return;}
        boolean financial=NotificationParser.looksFinancial(title,body);
        CapturedNotification event=NotificationParser.parse(pkg,title,body,status.getPostTime());
        if(!financial){
            saveDiagnostic(pkg,true,false,"Ignorada: valor/contexto financeiro não reconhecido",title,body,event.amountCents,event.reportedBalanceCents,event.direction);return;
        }
        if(event.amountCents==null){
            saveDiagnostic(pkg,true,true,"Reconhecida, mas sem valor monetário",title,body,null,event.reportedBalanceCents,event.direction);return;
        }
        EncryptedQueueStore store=new EncryptedQueueStore(this);
        boolean added=store.add(event);
        saveDiagnostic(pkg,true,true,store.lastAddResult(),title,body,event.amountCents,event.reportedBalanceCents,event.direction);
        if(added)sendBroadcast(new android.content.Intent("br.com.meuassessor.capture.QUEUE_CHANGED").setPackage(getPackageName()));
    }
    private static String first(Bundle e,String...keys){for(String k:keys){String v=text(e.getCharSequence(k));if(!v.isEmpty())return v;}return "";}
    private static String lines(CharSequence[] values){if(values==null)return "";StringBuilder b=new StringBuilder();for(CharSequence v:values){String s=text(v);if(!s.isEmpty()){if(b.length()>0)b.append(" | ");b.append(s);}}return b.toString();}
    private static String joinUnique(String...values){java.util.LinkedHashSet<String>s=new java.util.LinkedHashSet<>();for(String v:values)if(v!=null&&!v.trim().isEmpty())s.add(v.trim());return android.text.TextUtils.join(" | ",s);}
    private void rememberPackage(String packageName){
        if(packageName==null||packageName.isEmpty())return; SharedPreferences p=getSharedPreferences(DIAG_PREFS,Context.MODE_PRIVATE);
        String old=p.getString(KEY_RECENT_PACKAGES,""); java.util.LinkedHashSet<String> items=new java.util.LinkedHashSet<>(); items.add(packageName);
        if(old!=null&&!old.isEmpty())for(String item:old.split("\\n"))if(!item.isEmpty())items.add(item);
        StringBuilder out=new StringBuilder();int count=0;for(String item:items){if(count++>=12)break;if(out.length()>0)out.append('\n');out.append(item);}
        p.edit().putString(KEY_RECENT_PACKAGES,out.toString()).apply();
    }
    static void scrubLegacyDiagnostics(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(DIAG_PREFS, Context.MODE_PRIVATE);
        SharedPreferences.Editor edit = prefs.edit().remove(KEY_RAW_TITLE).remove(KEY_RAW_TEXT);
        String pkg = prefs.getString(KEY_PACKAGE, "");
        if (!BankAllowlist.contains(context, pkg)) {
            edit.remove(KEY_TITLE).remove(KEY_TEXT).remove(KEY_AMOUNT)
                    .remove(KEY_REPORTED_BALANCE).remove(KEY_DIRECTION)
                    .putBoolean(KEY_ALLOWED, false).putBoolean(KEY_FINANCIAL, false);
        }
        edit.apply();
    }
    static boolean isConnectedNow(){BankNotificationListener listener=active.get();return listener!=null&&listener.connected;}
    static void reconnect(Context c){
        BankNotificationListener listener=active.get();
        if(listener!=null&&listener.connected)new android.os.Handler(android.os.Looper.getMainLooper()).post(listener::recoverActiveNotifications);
        else requestRebind(new ComponentName(c,BankNotificationListener.class));
    }
    private void saveRawDiagnostic(String pkg,String title,String body,long postedAt){getSharedPreferences(DIAG_PREFS,Context.MODE_PRIVATE).edit().putString(KEY_RAW_PACKAGE,pkg==null?"":pkg).remove(KEY_RAW_TITLE).remove(KEY_RAW_TEXT).putLong(KEY_RAW_TIME,postedAt).apply();}
    private void saveDiagnostic(String pkg,boolean allowed,boolean financial,String result,String title,String body,Long amount,Long reportedBalance,String direction){
        SharedPreferences.Editor x=getSharedPreferences(DIAG_PREFS,Context.MODE_PRIVATE).edit().putString(KEY_PACKAGE,pkg==null?"":pkg)
                .putBoolean(KEY_ALLOWED,allowed).putBoolean(KEY_FINANCIAL,financial).putString(KEY_RESULT,result).putLong(KEY_TIME,System.currentTimeMillis())
                .putString(KEY_TITLE,CapturePrivacyPolicy.allowedContent(pkg,allowed,title)).putString(KEY_TEXT,CapturePrivacyPolicy.allowedContent(pkg,allowed,body)).putString(KEY_DIRECTION,direction==null?"":direction);
        if(allowed)x.putString(KEY_BANK_PACKAGE,pkg).putString(KEY_BANK_RESULT,result).putLong(KEY_BANK_TIME,System.currentTimeMillis());
        if(amount==null)x.remove(KEY_AMOUNT);else x.putLong(KEY_AMOUNT,amount); if(reportedBalance==null)x.remove(KEY_REPORTED_BALANCE);else x.putLong(KEY_REPORTED_BALANCE,reportedBalance); x.apply();
    }
    private static String text(CharSequence v){return v==null?"":v.toString().replaceAll("\\s+"," ").trim();}
}
