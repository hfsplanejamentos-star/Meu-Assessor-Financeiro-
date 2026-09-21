export type Direction = "expense" | "income" | "unknown";
export type Classification = {
  status: "classified" | "needs_review";
  category?: string;
  subcategory?: string;
  confidence: number;
  classifier: "rules" | "ai" | "pending";
};

const normalized = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const rules: Array<{ pattern: RegExp; category: string; subcategory: string }> = [
  { pattern: /deposito do latao|cerveja|chopp|bar\b/, category: "Cerveja", subcategory: "Bebidas" },
  { pattern: /airsoft|cinema|show|ingresso|entretenimento/, category: "Entretenimento", subcategory: "Lazer" },
  { pattern: /posto|gasolina|combustivel|etanol/, category: "Transporte", subcategory: "Combustível" },
  { pattern: /pista|pedagio|concessionaria/, category: "Transporte", subcategory: "Pedágio" },
  { pattern: /padaria|mercado|supermercado|hortifruti|restaurante|lanchonete/, category: "Alimentação", subcategory: "Alimentação" },
  { pattern: /drogaria|farmacia|consulta|laboratorio/, category: "Saúde", subcategory: "Saúde" },
  { pattern: /aluguel|condominio|energia|agua|internet residencial/, category: "Moradia", subcategory: "Moradia" },
  { pattern: /salario|rescisao|pix recebido|transferencia recebida/, category: "Receitas", subcategory: "Recebimento" },
];

export function classifyByRules(title: string, text: string, direction: Direction): Classification {
  const haystack = normalized(`${title} ${text}`);
  const match = rules.find((rule) => rule.pattern.test(haystack));
  if (match) return { status: "classified", category: match.category, subcategory: match.subcategory, confidence: 0.94, classifier: "rules" };
  if (direction === "income") return { status: "classified", category: "Receitas", subcategory: "Recebimento", confidence: 0.86, classifier: "rules" };
  return { status: "needs_review", confidence: 0, classifier: "pending" };
}

export function redactForAi(value: string): string {
  return value
    .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, "[CPF]")
    .replace(/\b\d{8,}\b/g, "[NÚMERO]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}
