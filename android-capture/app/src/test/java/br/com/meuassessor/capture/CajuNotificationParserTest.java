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

    @Test public void identicalPurchasesInSameMinuteHaveDistinctIds() {
        String title = "Pagamento aprovado";
        String body = "Compra de R$ 17,00 em Padaria APROVADA no CRÉDITO, saldo R$ 50,00.";
        long time = 1792342380000L;
        CapturedNotification first = NotificationParser.parse("com.caju.employee", title, body, time);
        CapturedNotification second = NotificationParser.parse("com.caju.employee", title, body, time + 10000L);
        assertEquals(Long.valueOf(1700), first.amountCents);
        assertEquals(Long.valueOf(1700), second.amountCents);
        assertNotEquals(first.id, second.id);
    }

    @Test public void repeatedNotificationWithSameTimestampKeepsId() {
        String title = "Pagamento aprovado";
        String body = "Compra de R$ 17,00 em Padaria APROVADA no CRÉDITO.";
        long time = 1792342380000L;
        CapturedNotification first = NotificationParser.parse("com.caju.employee", title, body, time);
        CapturedNotification repost = NotificationParser.parse("com.caju.employee", title, body, time);
        assertEquals(first.id, repost.id);
    }

    @Test public void pixReceivedIsIncomeAndPixSentIsExpense() {
        CapturedNotification received = NotificationParser.parse("com.c6bank.app",
                "Você recebeu um Pix", "Pix recebido no valor de R$ 1,00.", 1792342380000L);
        CapturedNotification sent = NotificationParser.parse("com.c6bank.app",
                "Pix realizado", "Pix realizado de R$ 1,00.", 1792342381000L);
        assertEquals("income", received.direction);
        assertEquals("expense", sent.direction);
        assertEquals(Long.valueOf(100), received.amountCents);
        assertEquals(Long.valueOf(100), sent.amountCents);
        assertNotEquals(received.id, sent.id);
    }
}
