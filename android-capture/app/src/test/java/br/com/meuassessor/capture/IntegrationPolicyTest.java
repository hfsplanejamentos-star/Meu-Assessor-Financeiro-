package br.com.meuassessor.capture;

import org.junit.Test;
import static org.junit.Assert.*;

public class IntegrationPolicyTest {
    @Test public void onlyHttpsConvexSiteOriginIsAccepted() {
        assertEquals("https://effervescent-marlin-88.convex.site", IntegrationPolicy.endpoint("https://effervescent-marlin-88.convex.site/"));
        for (String value : new String[]{"http://a.convex.site", "https://a.convex.site.attacker.test", "https://a.convex.cloud", "https://a.convex.site/api", "https://user@a.convex.site", "https://a.convex.site?x=1", "https://a.convex.site:444", "https://localhost", "file:///etc/passwd", "https://a.convex.site#x"}) assertNull(value, IntegrationPolicy.endpoint(value));
    }
    @Test public void credentialsCannotInjectHeaders() {
        assertTrue(IntegrationPolicy.validKey("a".repeat(32)));
        assertFalse(IntegrationPolicy.validKey("short"));
        assertFalse(IntegrationPolicy.validKey("a".repeat(32)+"\r\nInjected: true"));
        assertFalse(IntegrationPolicy.validKey("a".repeat(257)));
    }
    @Test public void arbitraryPathsAndMethodsAreDenied() {
        assertTrue(IntegrationPolicy.allowed("/ai/finance", "POST"));
        assertTrue(IntegrationPolicy.allowed("/ledger/changes", "POST"));
        assertTrue(IntegrationPolicy.allowed("/ledger/submit", "POST"));
        assertFalse(IntegrationPolicy.allowed("/ledger/submit", "GET"));
        assertFalse(IntegrationPolicy.allowed("/ledger/changes?owner=other", "POST"));
        assertTrue(IntegrationPolicy.allowed("/integrations/status", "GET"));
        assertFalse(IntegrationPolicy.allowed("/ai/finance", "GET"));
        assertFalse(IntegrationPolicy.allowed("https://other.test", "POST"));
        assertFalse(IntegrationPolicy.allowed("/finance/state", "POST"));
        assertFalse(IntegrationPolicy.allowed("/../finance/state", "POST"));
    }
}
