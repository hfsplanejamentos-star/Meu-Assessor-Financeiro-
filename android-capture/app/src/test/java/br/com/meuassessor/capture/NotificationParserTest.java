package br.com.meuassessor.capture;

import org.junit.Test;

import static org.junit.Assert.*;

public class NotificationParserTest {
    @Test public void parsesBrazilianCurrency() {
        assertEquals(Long.valueOf(6630), NotificationParser.extractAmountCents("Pix enviado de R$ 66,30"));
        assertEquals(Long.valueOf(123456), NotificationParser.extractAmountCents("Compra aprovada R$ 1.234,56"));
    }

    @Test public void rejectsNonFinancialNotification() {
        assertFalse(NotificationParser.looksFinancial("Novidade", "Confira as condições do seu banco"));
    }

    @Test public void recognizesExpenseAndCreatesStableId() {
        CapturedNotification first = NotificationParser.parse("com.c6bank.app", "Pix enviado", "R$ 80,00 para Depósito do Latão", 1_000_000L);
        CapturedNotification repeated = NotificationParser.parse("com.c6bank.app", "Pix enviado", "R$ 80,00 para Depósito do Latão", 1_000_500L);
        assertEquals(Long.valueOf(8000), first.amountCents);
        assertEquals("expense", first.direction);
        assertEquals(first.id, repeated.id);
    }
}
