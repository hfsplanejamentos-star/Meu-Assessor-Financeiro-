package br.com.meuassessor.capture;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class NotificationParser {
    private static final Pattern MONEY = Pattern.compile("(?i)(?:R\\$|BRL)?\\s*([0-9]{1,3}(?:\\.[0-9]{3})*,[0-9]{2}|[0-9]+,[0-9]{2})");
    private static final Pattern OUT = Pattern.compile("(?i)\\b(compra|comprou|pagamento|pagou|pix enviado|pix realizado|pix feito|enviou(?: um)? pix|d[eé]bito|debitado|sa[ií]da|transfer[eê]ncia enviada|transferiu|cart[aã]o|aprovad[ao]|gasto)\\b");
    private static final Pattern IN = Pattern.compile("(?i)\\b(recebido|recebeu(?: um)? pix|pix recebido|dep[oó]sito recebido|creditado|cr[eé]dito|entrada|transfer[eê]ncia recebida|recebeu|cashback|estorno)\\b");
    private static final Pattern FINANCIAL_CONTEXT = Pattern.compile("(?i)\\b(pix|compra|pagamento|cart[aã]o|d[eé]bito|cr[eé]dito|transfer[eê]ncia|saldo|conta|fatura|cashback|estorno)\\b");

    static CapturedNotification parse(String sourcePackage, String title, String text, long postedAt) {
        String safeTitle = clean(title);
        String safeText = clean(text);
        String combined = (safeTitle + " " + safeText).trim();
        Long amount = extractAmountCents(combined);
        String direction = OUT.matcher(combined).find() ? "expense" : IN.matcher(combined).find() ? "income" : "unknown";
        long bucket = postedAt / 60_000L;
        String id = sha256(sourcePackage + "|" + normalize(combined) + "|" + amount + "|" + bucket);
        return new CapturedNotification(id, sourcePackage, safeTitle, safeText, amount, direction, postedAt, System.currentTimeMillis());
    }

    static boolean looksFinancial(String title, String text) {
        String value = clean(title) + " " + clean(text);
        return MONEY.matcher(value).find() && (OUT.matcher(value).find() || IN.matcher(value).find() || FINANCIAL_CONTEXT.matcher(value).find());
    }

    static Long extractAmountCents(String value) {
        Matcher matcher = MONEY.matcher(clean(value));
        if (!matcher.find()) return null;
        String decimal = matcher.group(1).replace(".", "").replace(',', '.');
        try { return new BigDecimal(decimal).setScale(2, RoundingMode.HALF_UP).movePointRight(2).longValueExact(); }
        catch (RuntimeException ignored) { return null; }
    }

    private static String clean(String value) {
        if (value == null) return "";
        return value.replaceAll("[\\p{Cntrl}&&[^\\r\\n\\t]]", "").replaceAll("\\s+", " ").trim();
    }
    private static String normalize(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT).trim();
    }
    private static String sha256(String value) {
        try {
            byte[] bytes = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder out = new StringBuilder();
            for (byte b : bytes) out.append(String.format(Locale.ROOT, "%02x", b));
            return out.toString();
        } catch (Exception impossible) { throw new IllegalStateException(impossible); }
    }
}
