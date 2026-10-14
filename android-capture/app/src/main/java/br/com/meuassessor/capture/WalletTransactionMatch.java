package br.com.meuassessor.capture;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Conservative correlation of Wallet and bank notifications for the same purchase.
 * Equal amounts alone never imply duplicates; merchant and event time must also match.
 */
final class WalletTransactionMatch {
    private static final String WALLET_PACKAGE = "com.google.android.apps.walletnfcrel";
    private static final long MAX_TIME_DIFFERENCE_MS = 90_000L;
    private static final Pattern MERCHANT = Pattern.compile(
            "\\b(?:estabelecimento|loja|merchant|em|no|na|para)\\s*[:\\-]?\\s*" +
            "([a-z0-9][a-z0-9 &'\\-.]{2,50})");
    private static final Pattern MERCHANT_SUFFIX = Pattern.compile(
            "\\b(?:no valor|valor|com|usando|via|pelo|cartao|credito|debito|" +
            "aprovada|aprovado|confirmada|confirmado|final|terminado|foi|as|para)\\b.*$");

    static boolean matches(String pkgA, String pkgB,
                           String titleA, String textA, String titleB, String textB,
                           Long amountA, Long amountB, String directionA, String directionB,
                           long timestampA, long timestampB) {
        if (amountA == null || !amountA.equals(amountB)) return false;
        if (!"expense".equals(directionA) || !directionA.equals(directionB)) return false;
        boolean firstWallet = WALLET_PACKAGE.equals(pkgA);
        boolean secondWallet = WALLET_PACKAGE.equals(pkgB);
        if (firstWallet == secondWallet) return false;
        if (Math.abs(timestampA - timestampB) > MAX_TIME_DIFFERENCE_MS) return false;
        String a = merchant(titleA + " " + textA);
        String b = merchant(titleB + " " + textB);
        return a.length() >= 4 && a.equals(b);
    }

    private static String merchant(String value) {
        String normalized = Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("r\\$\\s*[0-9][0-9.,]*", " ")
                .replaceAll("\\s+", " ");
        Matcher found = MERCHANT.matcher(normalized);
        while (found.find()) {
            String name = MERCHANT_SUFFIX.matcher(found.group(1)).replaceFirst("")
                    .replaceAll("[^a-z0-9 ]", " ")
                    .replaceAll("\\s+", " ").trim();
            // Reject ambiguous context: only real merchant names are safe to coalesce.
            if (name.length() >= 4 && !name.equals("valor") && !name.equals("compra")
                    && !name.equals("pagamento") && !name.startsWith("valor ")) return name;
        }
        return "";
    }

    private WalletTransactionMatch() {}
}
