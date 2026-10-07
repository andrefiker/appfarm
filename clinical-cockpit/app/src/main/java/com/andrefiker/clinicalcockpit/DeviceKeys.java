package com.andrefiker.clinicalcockpit;
import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.AtomicFile;
import android.util.Base64;
import org.json.JSONObject;
import java.io.File;
import java.security.KeyStore;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/** Keys wrapped by Android Keystore. No password or raw vault key on disk. */
final class DeviceKeys {
    private static final String ALIAS="clinicalcockpit.devicewrap.v1";
    final AtomicFile file;
    DeviceKeys(Context context){file=new AtomicFile(new File(context.getFilesDir(),"clinical.devicekeys"));}
    static String encode(byte[] b){return Base64.encodeToString(b,Base64.NO_WRAP);}
    private JSONObject entries() throws Exception {
        if(!MainActivity.exists(file))return new JSONObject();
        byte[] bytes=MainActivity.readLimited(file.openRead(),4096);
        JSONObject root=new JSONObject(new String(bytes,java.nio.charset.StandardCharsets.UTF_8));
        if(root.getInt("version")!=1)throw new IllegalArgumentException("Key index version");
        JSONObject keys=root.getJSONObject("keys");if(keys.length()>4)throw new IllegalArgumentException("Key index size");return keys;
    }
    private SecretKey wrapping(boolean create) throws Exception {
        KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);
        if(!store.containsAlias(ALIAS)){
            if(!create)throw new IllegalStateException("Device key unavailable");
            KeyGenerator gen=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
            gen.init(new KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT)
                .setKeySize(256).setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true).setUserAuthenticationRequired(false).build());return gen.generateKey();
        }
        return (SecretKey)store.getKey(ALIAS,null);
    }
    boolean contains(byte[] salt) throws Exception{return entries().has(encode(salt));}
    byte[] read(byte[] salt) throws Exception {
        JSONObject keys=entries();String id=encode(salt);if(!keys.has(id))return null;
        byte[] sealed=Base64.decode(keys.getString(id),Base64.NO_WRAP);
        if(sealed.length!=60)throw new IllegalArgumentException("Wrapped key length");
        Cipher c=Cipher.getInstance("AES/GCM/NoPadding");
        c.init(Cipher.DECRYPT_MODE,wrapping(false),new GCMParameterSpec(128,Arrays.copyOf(sealed,12)));c.updateAAD(salt);
        byte[] key=c.doFinal(sealed,12,sealed.length-12);if(key.length!=32)throw new IllegalArgumentException("Key length");return key;
    }
    void remember(byte[] key,byte[] salt,byte[][] keepSalts) throws Exception {
        if(key.length!=32||salt.length!=16)throw new IllegalArgumentException("Invalid key material");
        JSONObject old=entries(),next=new JSONObject();Set<String> keep=new HashSet<>();
        for(byte[] s:keepSalts)if(s!=null)keep.add(encode(s));
        for(String id:keep)if(old.has(id))next.put(id,old.getString(id));
        Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,wrapping(true));c.updateAAD(salt);
        byte[] encrypted=c.doFinal(key),sealed=new byte[12+encrypted.length];
        System.arraycopy(c.getIV(),0,sealed,0,12);System.arraycopy(encrypted,0,sealed,12,encrypted.length);
        next.put(encode(salt),encode(sealed));
        MainActivity.writeEnvelope(file,new JSONObject().put("version",1).put("keys",next).toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }
}
