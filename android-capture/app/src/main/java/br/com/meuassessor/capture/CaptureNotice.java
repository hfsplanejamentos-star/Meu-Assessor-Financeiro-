package br.com.meuassessor.capture;
import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.BitmapFactory;
import android.os.Build;
/** Generic lock-screen content; captured financial amounts stay inside the app. */
final class CaptureNotice {
    static final String EXTRA_REVIEW="snake_review_capture";
    private static final int ID=8401;
    static void update(Context context){
        NotificationManager manager=context.getSystemService(NotificationManager.class);if(manager==null)return;
        int count=new EncryptedQueueStore(context).size();if(count==0){manager.cancel(ID);return;}
        if(Build.VERSION.SDK_INT>=33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)return;
        manager.createNotificationChannel(new NotificationChannel("bank_capture_v1","Gastos para revisar",NotificationManager.IMPORTANCE_DEFAULT));
        Intent intent=new Intent(context,MainActivity.class).putExtra(EXTRA_REVIEW,true).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent tap=PendingIntent.getActivity(context,8401,intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Notification notice=new Notification.Builder(context,"bank_capture_v1").setSmallIcon(android.R.drawable.ic_dialog_info)
            .setLargeIcon(BitmapFactory.decodeResource(context.getResources(),R.drawable.snake_logo_approved))
            .setContentTitle("Snake Finance · Gasto para revisar").setContentText(count+" notificação(ões) bancária(s). Toque para conferir e registrar.")
            .setContentIntent(tap).setAutoCancel(true).setOnlyAlertOnce(true).setVisibility(Notification.VISIBILITY_PRIVATE).build();
        try{manager.notify(ID,notice);}catch(SecurityException ignored){}
    }
}
