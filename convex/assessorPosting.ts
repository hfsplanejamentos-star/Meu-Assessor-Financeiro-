/**
 * Deterministic, side-effect-free posting planner for the existing financeState payload.
 * Only a confirmed, non-card cash transaction is eligible. Caju, credit-card,
 * investments, transfers and recurring payments require dedicated adapters.
 */
export type AssessorPostingDraft = {
  draftId: string;
  amountCents: number;
  direction: "expense" | "income";
  account: string;
  date: string;
  category: string;
  subcategory?: string;
  description: string;
  sourceType: string;
  sourceId?: string;
  transactionType?: string;
  counterparty?: string;
};
type Row = Record<string, any>;
export type PostingPlan =
  | { ok: false; error: string; alreadyPosted?: boolean }
  | { ok: true; payload: Row; transactionId: string; accountId: string; previousBalance: number; updatedBalance: number };

const normalize = (value: unknown) => String(value ?? "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const centsOf = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const cents = Math.round(value * 100);
  return Number.isSafeInteger(cents) && Math.abs(value * 100 - cents) < 0.0001 ? cents : null;
};
const objectRow = (value: unknown): value is Row => !!value && typeof value === "object" && !Array.isArray(value);

export function planAssessorCashPosting(payload: unknown, draft: AssessorPostingDraft): PostingPlan {
  if (!objectRow(payload) || !Array.isArray(payload.accounts) || !Array.isArray(payload.transactions))
    return { ok: false, error: "invalid_finance_payload" };
  if (!Number.isSafeInteger(draft.amountCents) || draft.amountCents <= 0 || draft.amountCents > 100_000_000_00)
    return { ok: false, error: "invalid_amount" };
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(draft.date);
  if (!date || new Date(Date.UTC(+date[1], +date[2] - 1, +date[3])).toISOString().slice(0, 10) !== draft.date)
    return { ok: false, error: "invalid_date" };
  if (!draft.description.trim() || !draft.category.trim())
    return { ok: false, error: "missing_fields" };

  const transactions: Row[] = payload.transactions;
  const matchedByDraft = transactions.filter(t => objectRow(t) &&
    (t.assessorDraftId === draft.draftId || t.id === "assessor_" + draft.draftId));
  if (matchedByDraft.length) return { ok: false, error: matchedByDraft.length > 1 ? "duplicate_reference" : "already_posted", alreadyPosted: matchedByDraft.length === 1 };

  // Never deduplicate by amount, date or description. Match only source identifiers.
  if (draft.sourceId && transactions.some(t => objectRow(t) && (
    (t.sourceType === draft.sourceType && t.sourceId === draft.sourceId) ||
    (draft.sourceType === "notification" && (t.androidNotificationId === draft.sourceId || t.externalId === draft.sourceId))
  ))) return { ok: false, error: "source_already_registered" };

  const matches = payload.accounts.filter((a: unknown) => objectRow(a) && a.id === draft.account);
  if (matches.length !== 1) return { ok: false, error: "account_not_found_or_ambiguous" };
  const account: Row = matches[0];
  const accountType = normalize(account.type);
  const accountIdentity = normalize([account.id, account.name, account.institution].join(" "));
  if (/caju|beneficio|investment|investimento|poupanca|meta|credito|cartao/.test(accountType + " " + accountIdentity) ||
      /\bxp\b/.test(accountIdentity))
    return { ok: false, error: "special_account_requires_adapter" };
  if (!/conta|corrente|dinheiro|cash|checking|banco|bank/.test(accountType))
    return { ok: false, error: "unsupported_account_type" };
  if (Array.isArray(payload.cards) && payload.cards.some((c: unknown) => objectRow(c) && c.id === account.id))
    return { ok: false, error: "card_requires_adapter" };

  const payment = normalize(draft.transactionType);
  if (payment && !/^(pix|debito|dinheiro|especie|deposito|transferencia recebida|recebimento)$/.test(payment))
    return { ok: false, error: "payment_type_requires_adapter" };
  const before = centsOf(account.balance);
  if (before === null) return { ok: false, error: "invalid_account_balance" };
  const signedCents = draft.direction === "expense" ? -draft.amountCents : draft.amountCents;
  const after = before + signedCents;
  if (!Number.isSafeInteger(after)) return { ok: false, error: "balance_overflow" };

  const transactionId = "assessor_" + draft.draftId;
  const transaction = {
    id: transactionId, assessorDraftId: draft.draftId,
    date: draft.date, desc: draft.description.trim(), value: signedCents / 100,
    cat: draft.category.trim(), sub: draft.subcategory?.trim() || "",
    account: account.id, accountId: account.id, card: null, cardId: null,
    status: "realized", origin: "Assessor IA",
    sourceType: draft.sourceType, ...(draft.sourceId ? { sourceId: draft.sourceId } : {}),
    ...(draft.transactionType ? { paymentType: draft.transactionType } : {}),
    ...(draft.counterparty ? { counterparty: draft.counterparty } : {}),
  };
  return {
    ok: true, transactionId, accountId: String(account.id),
    previousBalance: before / 100, updatedBalance: after / 100,
    payload: {
      ...payload,
      accounts: payload.accounts.map((a: Row) => a === account ? { ...a, balance: after / 100 } : a),
      transactions: [...transactions, transaction],
    },
  };
}
