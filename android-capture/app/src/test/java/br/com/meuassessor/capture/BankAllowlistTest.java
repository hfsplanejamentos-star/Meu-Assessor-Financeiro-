package br.com.meuassessor.capture;

import org.junit.Test;
import static org.junit.Assert.*;

public class BankAllowlistTest {
    @Test public void recognizesOnlyApprovedProviderNamespaces() {
        assertTrue(BankAllowlist.isRecognizedBankNamespace("com.c6bank.app"));
        assertTrue(BankAllowlist.isRecognizedBankNamespace("com.caju.employee"));
        assertTrue(BankAllowlist.isRecognizedBankNamespace("br.com.xp.carteira"));
        assertTrue(BankAllowlist.isRecognizedBankNamespace("br.com.itau.mobile"));
        assertFalse(BankAllowlist.isRecognizedBankNamespace("com.google.android.apps.walletnfcrel"));
        assertFalse(BankAllowlist.isRecognizedBankNamespace("com.android.vending"));
        assertFalse(BankAllowlist.isRecognizedBankNamespace("com.example.fakeitau"));
        assertFalse(BankAllowlist.isRecognizedBankNamespace("com.spoof.caju.transfer"));
        assertFalse(BankAllowlist.isRecognizedBankNamespace("com.example.c6bank.fake"));
    }
}
