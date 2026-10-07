import com.andrefiker.clinicalcockpit.VaultCrypto;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
/** Synthetic test fixture for the Android document picker; never bundled in APK. */
public final class BackupFixture {
    public static void main(String[] args)throws Exception {
        if(args[0].equals("verify")) {
            byte[] bytes=Files.readAllBytes(Path.of(args[1])),salt=VaultCrypto.salt(bytes),key=VaultCrypto.derive("portable release password".toCharArray(),salt);
            try{String plain=new String(VaultCrypto.decrypt(bytes,key),StandardCharsets.UTF_8);if(!plain.contains("CL-002")||!plain.contains("Synthetic release session only"))throw new AssertionError("Exported backup did not preserve baseline");System.out.println("Independent portable backup decryption passed");}finally{Arrays.fill(key,(byte)0);}return;
        }
        String data="{\"schema\":1,\"clients\":[{\"id\":\"fixture-099\",\"code\":\"CL-099\",\"next\":\"2026-10-08\",\"sessions\":[{\"id\":\"session-fixture\",\"date\":\"2026-10-07\",\"transcript\":\"Synthetic backup record only\",\"layer0\":\"Fictitious context\",\"road0\":\"Fictitious follow-up\"}]}],\"studies\":[]}";
        byte[] salt=VaultCrypto.randomSalt(),key=VaultCrypto.derive("different backup password".toCharArray(),salt);
        Files.write(Path.of(args[0]),VaultCrypto.encrypt(data.getBytes(StandardCharsets.UTF_8),key,salt));Arrays.fill(key,(byte)0);
    }
}
