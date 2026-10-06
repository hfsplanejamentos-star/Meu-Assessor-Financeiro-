package br.com.meuassessor.capture;
import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
/** Service capability key stays encrypted and is never returned to JavaScript. */
final class IntegrationStore {
    private static final Object LOCK = new Object();
    private static final String ALIAS="snake_integration_settings_v1";
    private final SharedPreferences prefs;
    IntegrationStore(Context context){prefs=context.getSharedPreferences("integration_settings",Context.MODE_PRIVATE);}
    boolean save(String url,String syncKey){
        String endpoint=IntegrationEndpoint.normalize(url);
        if(endpoint==null || syncKey==null || syncKey.length()<32 || syncKey.length()>256 || syncKey.indexOf('\n')>=0 || syncKey.indexOf('\r')>=0)return false;
        synchronized(LOCK){try{
            JSONObject plain=new JSONObject().put("url",endpoint).put("key",syncKey);
            Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key());
            String wrapped=new JSONObject().put("iv",Base64.getEncoder().encodeToString(cipher.getIV())).put("data",Base64.getEncoder().encodeToString(cipher.doFinal(plain.toString().getBytes(StandardCharsets.UTF_8)))).toString();
            return prefs.edit().putString("encrypted",wrapped).commit();
        }catch(Exception error){return false;}}
    }
    JSONObject read(){synchronized(LOCK){try{
        String wrapped=prefs.getString("encrypted",null);if(wrapped==null)return new JSONObject();
        JSONObject encrypted=new JSONObject(wrapped);Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Base64.getDecoder().decode(encrypted.getString("iv"))));
        return new JSONObject(new String(cipher.doFinal(Base64.getDecoder().decode(encrypted.getString("data"))),StandardCharsets.UTF_8));
    }catch(Exception error){return new JSONObject();}}}
    boolean clear(){synchronized(LOCK){return prefs.edit().clear().commit();}}
    String publicConfig(){JSONObject c=read();try{return new JSONObject().put("url",c.optString("url","")).put("configured",!c.optString("key","").isEmpty()).toString();}catch(Exception error){return "{}";}}
    private SecretKey key()throws Exception{
        KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);
        if(!store.containsAlias(ALIAS)){
            KeyGenerator generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
            generator.init(new KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setKeySize(256).build());generator.generateKey();
        }
        return ((KeyStore.SecretKeyEntry)store.getEntry(ALIAS,null)).getSecretKey();
    }
}
