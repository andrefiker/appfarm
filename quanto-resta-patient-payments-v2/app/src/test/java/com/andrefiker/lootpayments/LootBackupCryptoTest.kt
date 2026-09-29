package com.andrefiker.lootpayments

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertThrows
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [33])
class LootBackupCryptoTest {
    @Test fun encryptedBackupRoundTripsWithoutPlaintextLeak() {
        val source = "Paciente Exemplo — R$ 900"
        val encrypted = LootBackupCrypto.encrypt(source, "senha-forte".toCharArray())
        assertNotEquals(source, encrypted)
        assertEquals(false, encrypted.contains("Paciente Exemplo"))
        assertEquals(source, LootBackupCrypto.decrypt(encrypted, "senha-forte".toCharArray()))
    }

    @Test fun wrongPasswordIsRejected() {
        val encrypted = LootBackupCrypto.encrypt("conteúdo", "senha-correta".toCharArray())
        assertThrows(Exception::class.java) {
            LootBackupCrypto.decrypt(encrypted, "senha-errada".toCharArray())
        }
    }
}
