# V10 — Itens 32 a 40

- [x] 32 Upgrade da IA: gateway V10 criado com fallback local.
- [x] 33 Backend LLM: contrato `/ai/finance` isolado no gateway; a interface não chama fornecedor diretamente.
- [x] 34 Sem chave de IA no JS público: nenhuma chave é armazenada no cliente; `publicApiKey=false`.
- [x] 35 Interpretação separada da execução: `interpret()` produz intenção/draft; `execute()` é operação distinta.
- [x] 36 Confirmação para mutações: `execute(draft,false)` retorna `requiresConfirmation`; só grava com confirmação explícita.
- [x] 37 Cloud Sync reforçado: adaptador V10 lê/grava exclusivamente via FinanceStoreV10.
- [x] 38 Conflito Desktop/Mobile: versão otimista; HTTP 409 preserva estado local e retorna conflito.
- [x] 39 Service Worker/cache: cache V10 incrementado e módulos consolidados adicionados ao precache.
- [x] 40 Diagnóstico de dependências/startup: `V10Diagnostics.run()` verifica Store, Engine, Render, tema, Mobile, IA, Cloud, SW e modo real.

Nota do item 33: o contrato de backend está concluído na arquitetura V10, mas um provedor LLM externo só responderá quando o endpoint backend /ai/finance for implantado/configurado. Até lá o gateway usa interpretação local segura, sem expor segredo no navegador.
