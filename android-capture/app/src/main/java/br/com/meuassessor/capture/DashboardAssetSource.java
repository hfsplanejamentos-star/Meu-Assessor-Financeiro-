package br.com.meuassessor.capture;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;

/** Keeps document reloads on the installed dashboard without changing its storage origin. */
final class DashboardAssetSource {
    static final String BASE_URL = "https://hfsplanejamentos-star.github.io/Meu-Assessor-Financeiro-/";
    static final String ASSET = "dashboard-mobile.html";

    interface Opener {
        InputStream open(String name) throws IOException;
    }

    static boolean isDashboardUrl(String url) {
        try {
            URI uri = new URI(url);
            String path = uri.getPath();
            return "https".equalsIgnoreCase(uri.getScheme())
                    && "hfsplanejamentos-star.github.io".equalsIgnoreCase(uri.getHost())
                    && uri.getUserInfo() == null
                    && (uri.getPort() == -1 || uri.getPort() == 443)
                    && ("/Meu-Assessor-Financeiro-/".equals(path)
                    || "/Meu-Assessor-Financeiro-/index.html".equals(path));
        } catch (Exception invalid) {
            return false;
        }
    }

    static InputStream open(String url, boolean mainFrame, Opener opener) throws IOException {
        if (!mainFrame || !isDashboardUrl(url)) return null;
        return opener.open(ASSET);
    }
}
