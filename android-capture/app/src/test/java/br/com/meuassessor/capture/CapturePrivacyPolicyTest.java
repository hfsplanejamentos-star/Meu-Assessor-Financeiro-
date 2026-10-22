package br.com.meuassessor.capture;

import org.junit.Test;
import static org.junit.Assert.*;

public class CapturePrivacyPolicyTest {
    @Test public void onlyTheFourAuthorizedInstitutionsCanSupplyContent() {
        for (String pkg : new String[]{"com.c6bank.app","br.com.xp.carteira","com.caju.employee","br.com.itau"}) {
            assertTrue(CapturePrivacyPolicy.isSupportedPackage(pkg));
            assertEquals("bank notification", CapturePrivacyPolicy.allowedContent(pkg,true,"bank notification"));
            assertEquals("", CapturePrivacyPolicy.allowedContent(pkg,false,"bank notification"));
        }
    }

    @Test public void otherAppsAndSimilarPackageNamesAreAlwaysRedacted() {
        for (String pkg : new String[]{null,"","com.whatsapp.w4b","com.openai.chatgpt",
                "com.android.vending","com.google.android.apps.walletnfcrel",
                "com.c6bank.app.attacker","example.caju","com.xp.fake","not.itau"}) {
            assertFalse(CapturePrivacyPolicy.isSupportedPackage(pkg));
            assertEquals("",CapturePrivacyPolicy.allowedContent(pkg,true,"private unrelated message"));
            assertEquals("",CapturePrivacyPolicy.allowedContent(pkg,false,"private unrelated message"));
        }
    }

    @Test public void authorizedDiagnosticsAreBoundedWithoutAffectingParserInputs() {
        assertEquals("",CapturePrivacyPolicy.allowedContent("com.c6bank.app",true,null));
        assertEquals(512,CapturePrivacyPolicy.allowedContent("com.c6bank.app",true,new String(new char[1024])).length());
    }
}
