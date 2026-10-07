package br.com.meuassessor.capture;

import org.junit.Test;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicInteger;
import static org.junit.Assert.*;

public final class DashboardAssetSourceTest {
    private Path dashboard() {
        for (String candidate : new String[]{"src/main/assets/dashboard-mobile.html",
                "app/src/main/assets/dashboard-mobile.html", "android-capture/app/src/main/assets/dashboard-mobile.html"}) {
            Path path = Path.of(candidate);
            if (Files.exists(path)) return path;
        }
        throw new AssertionError("Bundled dashboard is missing");
    }

    @Test public void startupReloadAndSavedHistoryReadTheInstalledAsset() throws Exception {
        byte[] expected = Files.readAllBytes(dashboard());
        assertTrue(new String(expected, StandardCharsets.UTF_8).contains("window.SNAKE_DISTRIBUTABLE=true"));
        assertTrue(new String(expected, StandardCharsets.UTF_8).contains("function reloadDashboardView()"));
        for (String url : new String[]{DashboardAssetSource.BASE_URL + "?android=1.4.7",
                DashboardAssetSource.BASE_URL + "?android=1.4.4&t=123",
                DashboardAssetSource.BASE_URL + "index.html?release=atual-r286",
                DashboardAssetSource.BASE_URL + "#backup"}) {
            AtomicInteger opens = new AtomicInteger();
            try (InputStream stream = DashboardAssetSource.open(url, true, name -> {
                assertEquals("dashboard-mobile.html", name);
                opens.incrementAndGet();
                return Files.newInputStream(dashboard());
            })) {
                assertNotNull(stream);
                assertArrayEquals(expected, stream.readAllBytes());
            }
            assertEquals(1, opens.get());
        }
    }

    @Test public void unrelatedOriginsAndSubresourcesDoNotReceiveTheDocument() throws Exception {
        for (String url : new String[]{"http://hfsplanejamentos-star.github.io/Meu-Assessor-Financeiro-/",
                "https://hfsplanejamentos-star.github.io.evil.test/Meu-Assessor-Financeiro-/",
                "https://evil.test/Meu-Assessor-Financeiro-/",
                "https://hfsplanejamentos-star.github.io/another-project/",
                "https://hfsplanejamentos-star.github.io/Meu-Assessor-Financeiro-/sw.js",
                "https://user@hfsplanejamentos-star.github.io/Meu-Assessor-Financeiro-/",
                "https://hfsplanejamentos-star.github.io:444/Meu-Assessor-Financeiro-/"}) {
            assertNull(DashboardAssetSource.open(url, true, name -> {throw new AssertionError("Unexpected asset read");}));
        }
        assertNull(DashboardAssetSource.open(DashboardAssetSource.BASE_URL, false,
                name -> {throw new AssertionError("Subresource received document");}));
    }

    @Test public void missingBundleFailsLocallyRatherThanReturningANetworkFallback() {
        try {
            DashboardAssetSource.open(DashboardAssetSource.BASE_URL, true,
                    name -> {throw new IOException("missing installed document");});
            fail("Missing asset must fail explicitly");
        } catch (IOException expected) {
            assertEquals("missing installed document", expected.getMessage());
        }
    }
}
