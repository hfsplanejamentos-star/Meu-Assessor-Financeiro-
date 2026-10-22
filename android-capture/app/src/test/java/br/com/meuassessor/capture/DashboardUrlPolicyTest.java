package br.com.meuassessor.capture;

import org.junit.Test;
import static org.junit.Assert.*;

public class DashboardUrlPolicyTest {
    @Test public void startupBrowserReloadAndHistoryResolveToBundledAsset() {
        for (String path : new String[]{"/", "/index.html", "/snake-finance-mobile.html"}) {
            String url = "https://hfsplanejamentos-star.github.io/Meu-Assessor-Financeiro-" + path;
            assertTrue(url, DashboardUrlPolicy.isBundledDashboard(url));
            assertTrue(url, DashboardUrlPolicy.isBundledDashboard(url + "?android=1.5.9#backup"));
        }
    }

    @Test public void unrelatedHostsPathsAndUntrustedSchemesAreNotIntercepted() {
        for (String url : new String[]{null, "", "not a URL", "file:///android_asset/snake-finance-mobile.html",
                "http://hfsplanejamentos-star.github.io/Meu-Assessor-Financeiro-/",
                "https://hfsplanejamentos-star.github.io.attacker.test/Meu-Assessor-Financeiro-/",
                "https://hfsplanejamentos-star.github.io/other/index.html",
                "https://hfsplanejamentos-star.github.io/Meu-Assessor-Financeiro-/android-version.json",
                "https://hfsplanejamentos-star.github.io:8443/Meu-Assessor-Financeiro-/"}) {
            assertFalse(url, DashboardUrlPolicy.isBundledDashboard(url));
        }
    }
}
