/**
 * Headless client for the approved Assessor IA interface.
 * No DOM changes, no automatic posting, and no silent transaction creation.
 * Call confirmCash() ONLY from an explicit "Confirmar" user action.
 */
(function (root) {
  "use strict";
  const API = "https://effervescent-marlin-88.convex.site";
  const KEY = "assessor_cloud_sync_key";

  function key() {
    const value = (root.localStorage?.getItem(KEY) || "").trim();
    if (value.length < 32 || value.length > 256)
      throw new Error("A chave de sincronização do Assessor IA deve ter de 32 a 256 caracteres.");
    return value;
  }
  async function request(path, {method="GET",body}={}) {
    const response = await root.fetch(API + path, {
      method, cache:"no-store",
      headers: {"Content-Type":"application/json","X-Sync-Key":key()},
      ...(body===undefined?{}:{body:JSON.stringify(body)}),
    });
    const data = await response.json().catch(()=>({ok:false,error:"invalid_response"}));
    if (!response.ok || data.ok===false) {
      const error = new Error(data.error || "request_failed");
      error.code = data.error || "request_failed";
      error.status = response.status;
      error.details = data;
      throw error;
    }
    return data;
  }
  function newDraftId() {
    if (!root.crypto?.randomUUID) throw new Error("Identificador seguro indisponível");
    return root.crypto.randomUUID();
  }
  function prepare(draft) {
    if (!draft || typeof draft!=="object") throw new Error("Rascunho ausente");
    if (!draft.draftId) throw new Error("Informe um draftId estável para evitar duplicidade");
    return request("/assessor/drafts",{method:"POST",body:draft});
  }
  function confirm(draftId) {
    return request("/assessor/decision",{method:"POST",body:{draftId,decision:"confirm"}});
  }
  function reject(draftId) {
    return request("/assessor/decision",{method:"POST",body:{draftId,decision:"reject"}});
  }
  function postCash(draftId,baseVersion) {
    return request("/assessor/post",{method:"POST",body:{
      draftId,...(baseVersion===undefined?{}:{baseVersion})
    }});
  }
  async function confirmCash(draftId,baseVersion) {
    // Explicit confirmation persists before posting. A failed post must be
    // shown as "confirmado, mas não lançado", never as a successful expense.
    await confirm(draftId);
    let posting;
    try {
      posting = await postCash(draftId,baseVersion);
    } catch (cause) {
      // A timeout after a server commit is NOT proof the posting failed.
      const definiteFailure = typeof cause?.status==="number" && cause.status>=400;
      const err = new Error(definiteFailure ? "confirmed_not_posted" : "posting_status_unknown");
      err.code = definiteFailure ? "confirmed_not_posted" : "posting_status_unknown";
      err.cause = cause;
      throw err;
    }
    const posted=!!(posting.financeStateUpdated || posting.alreadyPosted);
    let syncPending=false;
    if (posted && root.FinanceCloud?.pull) {
      try { await root.FinanceCloud.pull(); }
      catch (_) { syncPending=true; }
    }
    return {confirmed:true,posted,syncPending,posting};
  }
  const listPending = () => request("/assessor/drafts?status=pending");
  const listConfirmed = () => request("/assessor/drafts?status=confirmed");
  const reconciliation = () => request("/assessor/reconciliation");

  root.SnakeAssessorApi = Object.freeze({
    newDraftId,prepare,confirm,reject,postCash,confirmCash,
    listPending,listConfirmed,reconciliation,
  });
})(window);
