# Assessor IA Mobile — contrato de validação

A interface de demonstração não movimenta dinheiro nem altera o estado financeiro.

Fluxo previsto:
1. Interpretar mensagem via /ai/finance.
2. Exibir prévia editável (valor, conta, categoria, data, descrição, meio de pagamento).
3. Após consentimento, criar rascunho via POST /assessor/drafts.
4. Confirmar ou rejeitar via POST /assessor/decision.
5. **Confirmação de rascunho não equivale a lançamento financeiro**: integrar a escrita atômica ao financeState antes de ativar o botão de efetivação real.

Critérios para liberar: impedir duplo clique e retries, separar transações de mesmo valor, auditar saldo Caju, recorrências, cartões, sincronização Desktop/Mobile, proteção da chave e testes em ambiente de desenvolvimento.

A allowlist no backend contempla apenas C6, Caju, Itaú e XP; a captura Android precisa ser auditada separadamente.
