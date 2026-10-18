package br.com.meuassessor.capture;

import org.junit.Test;
import static org.junit.Assert.*;

public class CajuNotificationParserTest {
    @Test public void recognizesApprovedCajuPurchaseAndIgnoresReportedBalance() {
        String title = "Pagamento aprovado";
        String body = "Compra de R$ 17,00 em Padaria E Confeit APROVADA no CRÉDITO, seu saldo em AUXÍLIO ALIMENTAÇÃO é R$ 50,00. Use VOUCHER no próximo pagamento.";
        assertTrue(NotificationParser.looksFinancial(title, body));
        CapturedNotification event = NotificationParser.parse("com.caju.employee", title, body, 1792342380000L);
        assertEquals(Long.valueOf(1700), event.amountCents);
        assertEquals("expense", event.direction);
    }

    @Test public void distinctPurchasesWithDifferentValuesAreNotIdentical() {
        String title = "Pagamento aprovado";
        CapturedNotification a = NotificationParser.parse("com.caju.employee", title,
                "Compra de R$ 28,00 em Padaria E Confeit APROVADA no CRÉDITO, seu saldo em AUXÍLIO ALIMENTAÇÃO é R$ 67,00.", 1792253220000L);
        CapturedNotification b = NotificationParser.parse("com.caju.employee", title,
                "Compra de R$ 19,00 em Padaria E Confeit APROVADA no CRÉDITO, seu saldo em AUXÍLIO ALIMENTAÇÃO é R$ 95,00.", 1792219020000L);
        assertEquals(Long.valueOf(2800), a.amountCents);
        assertEquals(Long.valueOf(1900), b.amountCents);
        assertNotEquals(a.id, b.id);
    }
}
