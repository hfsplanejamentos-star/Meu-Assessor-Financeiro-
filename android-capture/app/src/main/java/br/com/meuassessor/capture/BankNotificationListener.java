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
            KEY_TITLE="last_title", KEY_TEXT="last_text", KEY_AMOUNT="last_amount", KEY_DIRECTION="last_direction";

    @Override public void onListenerConnected() {
        super.onListenerConnected();
        getSharedPreferences(DIAG_PREFS,Context.MODE_PRIVATE).edit().putBoolean(KEY_CONNECTED,true)
                .putString(KEY_RESULT,"Serviço conectado e aguardando notificação").putLong(KEY_TIME,System.currentTimeMillis()).apply();
    }
    @Override public void onListenerDisconnected() {
        super.onListenerDisconnected();
        getSharedPreferences(DIAG_PREFS,Context.MODE_PRIVATE).edit().putBoolean(KEY_CONNECTED,false)
                .putString(KEY_RESULT,"Serviço desconectado; solicitando reconexão").putLong(KEY_TIME,System.currentTimeMillis()).apply();
        requestRebind(new ComponentName(this,BankNotificationListener.class));
    }
    @Override public void onNotificationPosted(StatusBarNotification status) {
        if(status==null)return;
        String pkg=status.getPackageName(); rememberPackage(pkg);
        boolean allowed=BankAllowlist.contains(this,pkg);
        if(!allowed){saveDiagnostic(pkg,false,false,"Ignorada: aplicativo não autorizado","","",null,"");return;}
        Notification n=status.getNotification();
        if(n==null){saveDiagnostic(pkg,true,false,"Ignorada: notificação sem conteúdo","","",null,"");return;}
        Bundle e=n.extras;
        String title=first(e,Notification.EXTRA_TITLE,Notification.EXTRA_TITLE_BIG);
        String body=joinUnique(
                text(e.getCharSequence(Notification.EXTRA_BIG_TEXT)),
                text(e.getCharSequence(Notification.EXTRA_TEXT)),
                text(e.getCharSequence(Notification.EXTRA_SUB_TEXT)),
                text(e.getCharSequence(Notification.EXTRA_INFO_TEXT)),
                lines(e.getCharSequenceArray(Notification.EXTRA_TEXT_LINES))
        );
        boolean financial=NotificationParser.looksFinancial(title,body);
        CapturedNotification event=NotificationParser.parse(pkg,title,body,status.getPostTime());
        if(!financial){
            saveDiagnostic(pkg,true,false,"Ignorada: valor/contexto financeiro não reconhecido",title,body,event.amountCents,event.direction);return;
        }
        if(event.amountCents==null){
            saveDiagnostic(pkg,true,true,"Reconhecida, mas sem valor monetário",title,body,null,event.direction);return;
        }
        boolean added=new EncryptedQueueStore(this).add(event);
        saveDiagnostic(pkg,true,true,added?"Capturada e adicionada à fila":"Reconhecida, mas duplicada/erro de fila",title,body,event.amountCents,event.direction);
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
    static void reconnect(Context c){requestRebind(new ComponentName(c,BankNotificationListener.class));}
    private void saveDiagnostic(String pkg,boolean allowed,boolean financial,String result,String title,String body,Long amount,String direction){
        SharedPreferences.Editor x=getSharedPreferences(DIAG_PREFS,Context.MODE_PRIVATE).edit().putString(KEY_PACKAGE,pkg==null?"":pkg)
                .putBoolean(KEY_ALLOWED,allowed).putBoolean(KEY_FINANCIAL,financial).putString(KEY_RESULT,result).putLong(KEY_TIME,System.currentTimeMillis())
                .putString(KEY_TITLE,title==null?"":title).putString(KEY_TEXT,body==null?"":body).putString(KEY_DIRECTION,direction==null?"":direction);
        if(amount==null)x.remove(KEY_AMOUNT);else x.putLong(KEY_AMOUNT,amount);x.apply();
    }
    private static String text(CharSequence v){return v==null?"":v.toString().replaceAll("\\s+"," ").trim();}
}
