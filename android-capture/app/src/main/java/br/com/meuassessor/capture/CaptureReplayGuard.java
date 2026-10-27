package br.com.meuassessor.capture;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;

/** Recovery is bounded; acknowledgment keeps only hashes, never notification text. */
final class CaptureReplayGuard {
    static final long RECOVERY_WINDOW_MS = 24L * 60 * 60 * 1000;
    static final long HISTORY_WINDOW_MS = 7L * RECOVERY_WINDOW_MS;
    static final long DUPLICATE_WINDOW_MS = 120000L;

    static boolean canRecover(long postedAt, long now) {
        return postedAt > 0 && postedAt <= now + 60000L && postedAt >= now - RECOVERY_WINDOW_MS;
    }

    static boolean matches(String id, String signature, long postedAt,
                           String priorId, String priorSignature, long priorPostedAt) {
        if (id != null && !id.isEmpty() && id.equals(priorId)) return true;
        return signature != null && !signature.isEmpty() && signature.equals(priorSignature)
                && Math.abs(postedAt - priorPostedAt) <= DUPLICATE_WINDOW_MS;
    }

    static String signature(String pkg, String direction, Long amount, String title, String text) {
        String content = ((title == null ? "" : title) + " " + (text == null ? "" : text))
                .toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
        String value = pkg + "|" + direction + "|" + amount + "|" + content;
        try {
            byte[] bytes = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder out = new StringBuilder();
            for (byte b : bytes) out.append(String.format(Locale.ROOT, "%02x", b));
            return out.toString();
        } catch (Exception impossible) { throw new IllegalStateException(impossible); }
    }
    private CaptureReplayGuard() {}
}
