package br.com.meuassessor.capture;

/** Notification content is restricted to explicitly supported bank applications. */
final class CapturePrivacyPolicy {
    private CapturePrivacyPolicy() {}

    static boolean isSupportedPackage(String pkg) {
        return "com.c6bank.app".equals(pkg)
                || "br.com.xp.carteira".equals(pkg)
                || "com.caju.employee".equals(pkg)
                || "br.com.itau".equals(pkg);
    }

    static String allowedContent(String pkg, boolean enabled, String content) {
        if (!enabled || !isSupportedPackage(pkg) || content == null) return "";
        return content.length() <= 512 ? content : content.substring(0, 512);
    }
}
