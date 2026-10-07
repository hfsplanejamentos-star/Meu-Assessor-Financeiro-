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
    private static final Pattern BALANCE = Pattern.compile("(?i)\\bsaldo(?:\\s+(?:em|dispon[ií]vel(?:\\s+em)?))?[^R$0-9]{0,60}(?:R\\$|BRL)?\\s*([0-9]{1,3}(?:\\.[0-9]{3})*,[0-9]{2}|[0-9]+,[0-9]{2})");
    private static final Pattern OUT = Pattern.compile("(?i)\\b(compra|comprou|pagamento|pagou|pix enviado|pix realizado|pix feito|enviou(?: um)? pix|d[eé]bito|debitado|sa[ií]da|transfer[eê]ncia enviada|transferiu|cart[aã]o|aprovad[ao]|gasto)\\b");
    private static final Pattern IN = Pattern.compile("(?i)\\b(recebido|recebemos|recebeu(?: um)? pix|voc[eê] recebeu|pix recebido|pix de .{0,80}? recebido|dep[oó]sito recebido|valor recebido|creditado|entrada|transfer[eê]ncia recebida|recebeu|cashback|estorno)\\b");
    private static final Pattern FINANCIAL_CONTEXT = Pattern.compile("(?i)\\b(pix|compra|pagamento|cart[aã]o|d[eé]bito|cr[eé]dito|transfer[eê]ncia|saldo|conta|fatura|cashback|estorno)\\b");

    static CapturedNotification parse(String sourcePackage, String title, String text, long postedAt) {
        String safeTitle = clean(title);
        String safeText = clean(text);
        String combined = (safeTitle + " " + safeText).trim();
        Long amount = extractTransactionAmountCents(combined);
        Long reportedBalance = extractReportedBalanceCents(combined);
        String direction;
        // Prioridade explícita: Pix/transferência recebida é entrada; "crédito" em compra é modalidade do cartão.
        boolean explicitIncome = Pattern.compile("(?i)\\b(pix|transfer[eê]ncia|valor|dep[oó]sito)\\b.{0,90}\\b(recebid[oa]|recebeu|creditad[oa])\\b|\\b(recebid[oa]|recebeu|creditad[oa])\\b.{0,90}\\b(pix|transfer[eê]ncia|valor|dep[oó]sito)\\b").matcher(combined).find();
        boolean approvedPurchase = Pattern.compile("(?i)\\b(compra|pagamento)\\b").matcher(combined).find()
                && Pattern.compile("(?i)\\b(aprovad[ao]|cr[eé]dito|d[eé]bito)\\b").matcher(combined).find();
        if (explicitIncome) {
            direction = "income";
        } else if (approvedPurchase) {
            direction = "expense";
        } else if (IN.matcher(combined).find()) {
            direction = "income";
        } else if (OUT.matcher(combined).find()) {
            direction = "expense";
        } else {
            direction = "unknown";
        }
        long bucket = postedAt / 60_000L;
        String id = sha256(sourcePackage + "|" + normalize(combined) + "|" + amount + "|" + bucket);
        return new CapturedNotification(id, sourcePackage, safeTitle, safeText, amount, reportedBalance, direction, postedAt, System.currentTimeMillis());
    }

    static boolean looksFinancial(String title, String text) {
        String value = clean(title) + " " + clean(text);
        return MONEY.matcher(value).find() && (OUT.matcher(value).find() || IN.matcher(value).find() || FINANCIAL_CONTEXT.matcher(value).find());
    }

    static Long extractTransactionAmountCents(String value) {
        String clean = clean(value);
        Matcher matcher = MONEY.matcher(clean);
        while (matcher.find()) {
            int from = Math.max(0, matcher.start()-28), to = Math.min(clean.length(), matcher.end()+12);
            if (Pattern.compile("(?i)saldo").matcher(clean.substring(from,to)).find()) continue;
            return parseCents(matcher.group(1));
        }
        return null;
    }

    static Long extractReportedBalanceCents(String value) {
        Matcher matcher = BALANCE.matcher(clean(value));
        if (!matcher.find()) return null;
        return parseCents(matcher.group(1));
    }

    private static Long parseCents(String raw) {
        if (raw == null) return null;
        String decimal = raw.replace(".", "").replace(',', '.');
        try { return new BigDecimal(decimal).setScale(2, RoundingMode.HALF_UP).movePointRight(2).longValueExact(); }
        catch (RuntimeException ignored) { return null; }
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
