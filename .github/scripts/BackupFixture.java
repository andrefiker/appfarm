import com.andrefiker.clinicalcockpit.VaultCrypto;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
/** Synthetic test fixture for the Android document picker; never bundled in APK. */
public final class BackupFixture {
    public static void main(String[] args)throws Exception {
        String data="{\"schema\":1,\"clients\":[{\"id\":\"fixture-099\",\"code\":\"CL-099\",\"next\":\"2026-10-08\",\"sessions\":[{\"id\":\"session-fixture\",\"date\":\"2026-10-07\",\"transcript\":\"Synthetic backup record only\",\"layer0\":\"Fictitious context\",\"road0\":\"Fictitious follow-up\"}]}],\"studies\":[]}";
        byte[] salt=VaultCrypto.randomSalt(),key=VaultCrypto.derive("different backup password".toCharArray(),salt);
        Files.write(Path.of(args[0]),VaultCrypto.encrypt(data.getBytes(StandardCharsets.UTF_8),key,salt));Arrays.fill(key,(byte)0);
    }
}
