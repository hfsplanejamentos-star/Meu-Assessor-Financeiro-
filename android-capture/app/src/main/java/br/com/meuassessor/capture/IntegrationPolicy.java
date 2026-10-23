package br.com.meuassessor.capture;

import java.net.URI;

final class IntegrationPolicy {
    static String endpoint(String value) {
        try {
            URI uri = new URI(value == null ? "" : value.trim());
            String host = uri.getHost();
            if (!"https".equals(uri.getScheme()) || host == null
                    || !host.matches("[a-z0-9-]+\\.convex\\.site")
                    || uri.getUserInfo() != null || uri.getRawQuery() != null
                    || uri.getRawFragment() != null || (uri.getPort() != -1 && uri.getPort() != 443)
                    || !(uri.getPath().isEmpty() || "/".equals(uri.getPath()))) return null;
            return "https://" + host;
        } catch (Exception invalid) { return null; }
    }

    static boolean validKey(String key) {
        return key != null && key.length() >= 32 && key.length() <= 256
                && key.matches("[\\x21-\\x7E]+");
    }

    static boolean allowed(String path, String method) {
        return ("/integrations/status".equals(path) && "GET".equals(method))
                || ("/ai/finance".equals(path) && "POST".equals(method))
                || (("/ledger/changes".equals(path) || "/ledger/submit".equals(path)) && "POST".equals(method));
    }
}
