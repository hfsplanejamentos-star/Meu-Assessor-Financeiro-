import assert from "node:assert/strict";
import { classifyByRules, redactForAi } from "../convex/notificationClassifier.ts";

assert.deepEqual(classifyByRules("Pix enviado", "R$ 80,00 Depósito do Latão", "expense"), {
  status: "classified",
  category: "Cerveja",
  subcategory: "Bebidas",
  confidence: 0.94,
  classifier: "rules",
});
assert.equal(classifyByRules("Pix enviado", "R$ 66,30 Airsoft", "expense").category, "Entretenimento");
assert.equal(classifyByRules("Pix recebido", "Você recebeu R$ 100,00", "income").category, "Receitas");
assert.equal(classifyByRules("Compra aprovada", "R$ 42,00 estabelecimento desconhecido", "expense").status, "needs_review");
assert.equal(redactForAi("CPF 123.456.789-00 conta 123456789"), "CPF [CPF] conta [NÚMERO]");

console.log("CLASSIFICAÇÃO DO BACKEND: APROVADA");
