package br.com.meuassessor.capture;

import org.junit.Test;
import static org.junit.Assert.*;

public class WalletTransactionMatchTest {
    private static boolean matches(String bankMerchant, String walletMerchant, long bankTime, long walletTime) {
        return WalletTransactionMatch.matches(
                "com.c6bank.app", "com.google.android.apps.walletnfcrel",
                "Compra aprovada", "Compra aprovada em " + bankMerchant + " no valor de R$ 50,00",
                "Pagamento realizado", "Você pagou R$ 50,00 em " + walletMerchant,
                5000L, 5000L, "expense", "expense", bankTime, walletTime);
    }

    @Test public void reconcilesSameMerchantAmountAndNearbyTime() {
        assertTrue(matches("Posto Trevo", "POSTO TREVO", 1_000_000L, 1_030_000L));
    }

    @Test public void equalAmountDifferentMerchantsAreNotDuplicates() {
        assertFalse(matches("Posto Trevo", "Estacionamento Centro", 1_000_000L, 1_030_000L));
    }

    @Test public void sameAmountAndMerchantAtDifferentTimesAreSeparatePurchases() {
        assertFalse(matches("Posto Trevo", "POSTO TREVO", 1_000_000L, 1_200_000L));
    }

    @Test public void pixAndWalletSameValueAreNotDuplicates() {
        assertFalse(WalletTransactionMatch.matches(
                "com.c6bank.app", "com.google.android.apps.walletnfcrel",
                "Pix enviado", "Pix de R$ 50,00 para Posto Trevo",
                "Pagamento realizado", "Você pagou R$ 50,00 em Posto Trevo",
                5000L, 5000L, "expense", "expense", 1_000_000L, 1_030_000L));
    }

    @Test public void bankToBankAndIncomesAreNotWalletDuplicates() {
        assertFalse(WalletTransactionMatch.matches(
                "com.c6bank.app", "com.caju.employee", "", "Compra em Padaria",
                "", "Compra em Padaria", 5000L, 5000L, "expense", "expense", 1000L, 2000L));
        assertFalse(WalletTransactionMatch.matches(
                "com.c6bank.app", "com.google.android.apps.walletnfcrel",
                "", "Pix recebido de Pedro", "", "Pix recebido de Pedro",
                5000L, 5000L, "income", "income", 1000L, 2000L));
    }
}
