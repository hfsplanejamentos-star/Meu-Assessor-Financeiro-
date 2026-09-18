# V10 — Matriz oficial dos 50 requisitos

Critério: **OK** somente após implementação + teste correspondente. **PARCIAL** não conta como concluído.

1. Eliminar patches empilhados — PENDENTE (legados ainda carregados)
2. Modularizar — OK (Store/Engine/UI V10 separados)
3. ES6 modules — PENDENTE (V10 ainda usa IIFE/globais de compatibilidade)
4. FinanceEngine único — OK no núcleo V10
5. FinanceStore único — OK no núcleo V10
6. Separar cálculo/UI — OK no núcleo V10
7. Remover demo da produção — OK no Store V10
8. Trocar storage de simulação — OK: meu_assessor_financeiro_v10_real
9. environment/dataMode explícitos — OK
10. schema versionado — OK (schema 2)
11. migração segura — OK, cópia saneada e idempotente
12. recorrência unificada — OK
13. planejado x realizado — OK no Engine
14. investimentos unificados — OK
15. patrimônio unificado — OK no Engine
16. disponível unificado — OK no Engine
17. categorias consistentes — OK
18. gráficos futuros — PARCIAL (Engine pronto; render legado ainda concorre)
19. filtros mensais sincronizados — PENDENTE
20. cards clicáveis — PARCIAL
21. gráficos interativos — PENDENTE
22. agenda ligada ao Engine — PENDENTE
23. conciliação explícita — PENDENTE
24. Caju separado — OK no Store/Engine
25. mobile-first — PARCIAL (dashboard/nav/temas criados; falta regressão visual)
26. cards mobile 2x2 — OK
27. hierarquia mobile — PARCIAL
28. bottom nav — OK
29. Desktop/Mobile visuais independentes, mesmo Engine — PARCIAL
30. preservar identidade original — OK via tema Atual
31. tema claro opcional — OK (+ Escuro/Atual)
32. upgrade IA — PENDENTE
33. LLM no backend — BLOQUEADO POR CREDENCIAL/PROVEDOR
34. nenhuma chave IA no JS público — OK arquitetural; depende do 33
35. separar interpretação IA/executar ação — PENDENTE
36. confirmação para mutações sensíveis — PENDENTE
37. cloud sync robusto — PENDENTE
38. conflito Desktop/Mobile — PENDENTE
39. SW/cache/build — PENDENTE
40. diagnóstico de dependências — PARCIAL (health.js)
41. build produção completo — PENDENTE
42. build portátil opcional — PENDENTE
43. testes unitários — PARCIAL (finance-tests.js)
44. regressão mensal — PARCIAL
45. integridade — PARCIAL
46. E2E UI — BLOQUEADO sem navegador E2E nesta execução
47. testes Desktop/Mobile — PARCIAL/visual pendente
48. validação matemática cruzada — PARCIAL
49. diagnóstico/health — OK
50. corrigir na fonte, não patches — PENDENTE até remover legados

## Gate de release
Não promover para main enquanto 1, 18–23, 25, 27, 29, 32–33, 35–48 e 50 não estiverem OK, e enquanto a bateria integrada não passar.
