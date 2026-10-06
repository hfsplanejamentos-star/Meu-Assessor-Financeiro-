package br.com.meuassessor.capture;
import org.junit.Test;
import static org.junit.Assert.*;
public class IntegrationEndpointTest {
 @Test public void strictHttpsServiceOrigin(){
  assertEquals("https://example-123.convex.site",IntegrationEndpoint.normalize("https://example-123.convex.site/"));
  for(String bad:new String[]{"http://example.convex.site","https://example.convex.site.evil.test","https://user:secret@example.convex.site","https://example.convex.site:444","https://example.convex.site/api","https://example.convex.site?key=x","https://example.convex.site#x","https://localhost","https://convex.site"})assertNull(bad,IntegrationEndpoint.normalize(bad));
 }
 @Test public void limitedReadAndReviewEndpoints(){
  assertTrue(IntegrationEndpoint.allows("/whatsapp/messages","GET"));
  assertTrue(IntegrationEndpoint.allows("/whatsapp/resolve","POST"));
  assertTrue(IntegrationEndpoint.allows("/ai/finance","POST"));
  assertFalse(IntegrationEndpoint.allows("/finance/state","POST"));
  assertFalse(IntegrationEndpoint.allows("//evil.example","GET"));
  assertFalse(IntegrationEndpoint.allows("/whatsapp/webhook","POST"));
 }
}
