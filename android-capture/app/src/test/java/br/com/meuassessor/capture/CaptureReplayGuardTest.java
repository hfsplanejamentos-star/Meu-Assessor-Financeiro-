package br.com.meuassessor.capture;

import org.junit.Test;
import static org.junit.Assert.*;

public class CaptureReplayGuardTest {
    @Test public void recoversOnlyRecentVisibleNotifications() {
        long now=1_800_000_000_000L;
        assertTrue(CaptureReplayGuard.canRecover(now,now));
        assertTrue(CaptureReplayGuard.canRecover(now-86400000L,now));
        assertFalse(CaptureReplayGuard.canRecover(now-86400001L,now));
        assertFalse(CaptureReplayGuard.canRecover(now+60001L,now));
        assertFalse(CaptureReplayGuard.canRecover(0L,now));
    }
    @Test public void acknowledgedRecoveryKeepsStableIdsAndHashedSignatures() {
        String sig=CaptureReplayGuard.signature("com.c6bank.app","expense",115L,"Você enviou um Pix","Pix enviado no valor de R$ 1,15, para TITULAR DA CONTA, CPF ***.***.***-**, em 27/10/2026.");
        assertEquals(64,sig.length());assertFalse(sig.contains("TITULAR"));
        assertTrue(CaptureReplayGuard.matches("same-id",sig,1000L,"same-id",sig,1000L));
        assertTrue(CaptureReplayGuard.matches("new-minute-id",sig,119000L,"prior-id",sig,1000L));
        assertFalse(CaptureReplayGuard.matches("new-id",sig,121001L,"prior-id",sig,1000L));
    }
    @Test public void directionBankAndRecipientPreventFalseCrossEventDeduplication() {
        String out=CaptureReplayGuard.signature("com.c6bank.app","expense",115L,"Pix","A");
        String in=CaptureReplayGuard.signature("br.com.xp.carteira","income",115L,"Pix","A");
        String reverse=CaptureReplayGuard.signature("com.c6bank.app","income",115L,"Pix","A");
        String recipient=CaptureReplayGuard.signature("com.c6bank.app","expense",115L,"Pix","B");
        assertNotEquals(out,in);assertNotEquals(out,reverse);assertNotEquals(out,recipient);
        assertFalse(CaptureReplayGuard.matches("a",out,1000L,"b",in,1000L));
    }
    @Test public void recognizesUserC6SentAndXpReceivedCurrencyAndDirection() {
        CapturedNotification c6=NotificationParser.parse("com.c6bank.app","Você enviou um Pix","Pix enviado no valor de R$ 1,15, para TITULAR DA CONTA, CPF ***.***.***-**, em 27/10/2026.",1000000L);
        CapturedNotification xp=NotificationParser.parse("br.com.xp.carteira","Pix recebido","Você recebeu um Pix de Titular da Conta, CPF: ***.***.***-** de R$ 1,15.",1000001L);
        CapturedNotification reverse=NotificationParser.parse("com.c6bank.app","Você recebeu um Pix","Pix recebido no valor de R$ 1,15, de TITULAR DA CONTA, CPF ***.***.***-**, em 27/10/2026.",1000002L);
        for(CapturedNotification e:new CapturedNotification[]{c6,xp,reverse}){assertTrue(NotificationParser.looksFinancial(e.title,e.text));assertEquals(Long.valueOf(115L),e.amountCents);}
        assertEquals("expense",c6.direction);assertEquals("income",xp.direction);assertEquals("income",reverse.direction);
        assertNotEquals(c6.id,xp.id);assertNotEquals(c6.id,reverse.id);
    }
}
