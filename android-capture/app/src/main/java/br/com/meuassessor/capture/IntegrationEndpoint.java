package br.com.meuassessor.capture;
import java.net.URI;
final class IntegrationEndpoint {
    static String normalize(String value) {
        try {
            URI uri = new URI(value == null ? "" : value.trim());
            String host = uri.getHost(), path = uri.getPath();
            if (!"https".equals(uri.getScheme()) || host == null || !host.matches("[a-z0-9-]+\\.convex\\.site") || uri.getUserInfo()!=null || (uri.getPort()!=-1 && uri.getPort()!=443) || uri.getQuery()!=null || uri.getFragment()!=null || (path!=null && !path.isEmpty() && !"/".equals(path))) return null;
            return "https://"+host;
        } catch (Exception error) { return null; }
    }
    static boolean allows(String path, String method) {
        return ("GET".equals(method) && ("/integrations/status".equals(path) || "/whatsapp/messages".equals(path))) || ("POST".equals(method) && (("/whatsapp/resolve".equals(path) || "/whatsapp/retry".equals(path)) || "/ai/finance".equals(path)));
    }
}
