package br.com.meuassessor.capture;

import org.json.JSONException;
import org.json.JSONObject;

final class CapturedNotification {
    final String id;
    final String sourcePackage;
    final String title;
    final String text;
    final Long amountCents;
    final Long reportedBalanceCents;
    final String direction;
    final long postedAt;
    final long capturedAt;

    CapturedNotification(String id, String sourcePackage, String title, String text,
                         Long amountCents, Long reportedBalanceCents, String direction, long postedAt, long capturedAt) {
        this.id = id;
        this.sourcePackage = sourcePackage;
        this.title = title;
        this.text = text;
        this.amountCents = amountCents;
        this.reportedBalanceCents = reportedBalanceCents;
        this.direction = direction;
        this.postedAt = postedAt;
        this.capturedAt = capturedAt;
    }

    JSONObject toJson() throws JSONException {
        JSONObject value = new JSONObject();
        value.put("id", id);
        value.put("sourcePackage", sourcePackage);
        value.put("title", title);
        value.put("text", text);
        if (amountCents == null) value.put("amountCents", JSONObject.NULL);
        else value.put("amountCents", amountCents);
        if (reportedBalanceCents == null) value.put("reportedBalanceCents", JSONObject.NULL); else value.put("reportedBalanceCents", reportedBalanceCents);
        value.put("direction", direction);
        value.put("postedAt", postedAt);
        value.put("capturedAt", capturedAt);
        value.put("schemaVersion", 2);
        return value;
    }
}
