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

    @Test public void recognizesRealC6AndXpPixPhrases() {
        CapturedNotification xp = NotificationParser.parse(
                "br.com.xp.carteira", "Pix realizado",
                "Você enviou um Pix para HEBERT no valor de R$ 1,00.", 2_000_000L);
        CapturedNotification c6 = NotificationParser.parse(
                "com.c6bank.app", "Você recebeu um Pix",
                "Pix recebido no valor de R$ 1,00, de HEBERT.", 2_100_000L);
        assertTrue(NotificationParser.looksFinancial(xp.title, xp.text));
        assertTrue(NotificationParser.looksFinancial(c6.title, c6.text));
        assertEquals("expense", xp.direction);
        assertEquals("income", c6.direction);
        assertEquals(Long.valueOf(100), xp.amountCents);
        assertEquals(Long.valueOf(100), c6.amountCents);
    }

    @Test public void recognizesExpenseAndCreatesStableId() {
        CapturedNotification first = NotificationParser.parse("com.c6bank.app", "Pix enviado", "R$ 80,00 para Depósito do Latão", 1_000_000L);
        CapturedNotification repeated = NotificationParser.parse("com.c6bank.app", "Pix enviado", "R$ 80,00 para Depósito do Latão", 1_000_500L);
        assertEquals(Long.valueOf(8000), first.amountCents);
        assertEquals("expense", first.direction);
        assertEquals(first.id, repeated.id);
    }
}
