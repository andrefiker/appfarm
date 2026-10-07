package com.andrefiker.clinicalcockpit;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Arrays;
import javax.crypto.Cipher;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;

/** Portable authenticated envelope. Password and plaintext never go to disk. */
public final class VaultCrypto {
    public static final int ITERATIONS = 310_000;
    public static final int MAX_BYTES = 8 * 1024 * 1024;
    private static final byte[] MAGIC = "CCVAULT1".getBytes(StandardCharsets.US_ASCII);
    private static final SecureRandom RANDOM = new SecureRandom();
    public static byte[] randomSalt() { byte[] b = new byte[16]; RANDOM.nextBytes(b); return b; }
    public static byte[] derive(char[] password, byte[] salt) throws Exception {
        if (salt.length != 16) throw new IllegalArgumentException("Invalid salt");
        PBEKeySpec spec = new PBEKeySpec(password, salt, ITERATIONS, 256);
        try { return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded(); }
        finally { spec.clearPassword(); }
    }
    public static byte[] salt(byte[] envelope) {
        if (envelope.length < 52 || envelope.length > MAX_BYTES + 56 || !Arrays.equals(MAGIC, Arrays.copyOf(envelope, 8)))
            throw new IllegalArgumentException("Arquivo de backup inválido");
        return Arrays.copyOfRange(envelope, 8, 24);
    }
    public static byte[] encrypt(byte[] plaintext, byte[] key, byte[] salt) throws Exception {
        if (plaintext.length > MAX_BYTES) throw new IllegalArgumentException("Cofre excedeu 8 MB");
        byte[] iv = new byte[12]; RANDOM.nextBytes(iv);
        byte[] header = ByteBuffer.allocate(36).put(MAGIC).put(salt).put(iv).array();
        Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
        c.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, iv));
        c.updateAAD(header);
        return ByteBuffer.allocate(plaintext.length + 52).put(header).put(c.doFinal(plaintext)).array();
    }
    public static byte[] decrypt(byte[] envelope, byte[] key) throws Exception {
        salt(envelope);
        Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
        c.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, Arrays.copyOfRange(envelope, 24, 36)));
        c.updateAAD(Arrays.copyOf(envelope, 36));
        return c.doFinal(envelope, 36, envelope.length - 36);
    }
}
