package br.com.meuassessor.capture;

import java.net.URI;

final class DashboardUrlPolicy {
    private DashboardUrlPolicy() {}

    static boolean isBundledDashboard(String value) {
        if (value == null) return false;
        try {
            URI uri = new URI(value);
            if (!"https".equalsIgnoreCase(uri.getScheme())
                    || !"hfsplanejamentos-star.github.io".equalsIgnoreCase(uri.getHost())
                    || uri.getUserInfo() != null
                    || (uri.getPort() != -1 && uri.getPort() != 443)) return false;
            String path = uri.getPath();
            return "/Meu-Assessor-Financeiro-/".equals(path)
                    || "/Meu-Assessor-Financeiro-/index.html".equals(path)
                    || "/Meu-Assessor-Financeiro-/snake-finance-mobile.html".equals(path);
        } catch (Exception invalidUrl) {
            return false;
        }
    }
}
