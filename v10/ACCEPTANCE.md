# V10 — Checklist mestre dos 50 itens

Status desta revisão: **não homologar 50/50 ainda**. O checklist abaixo distingue implementação real de pendência.

1. [ ] Eliminar patches empilhados
2. [x] Modularizar Store/motor
3. [ ] ES6 modules import/export
4. [x] FinanceEngine único V10
5. [x] FinanceStore único V10
6. [x] Separar cálculo/UI no caminho V10
7. [x] Remover demo da base V10 de produção
8. [x] Substituir storage de simulação no V10
9. [x] environment/dataMode explícitos
10. [x] schema versionado
11. [x] migração segura/idempotente
12. [x] recorrência unificada
13. [x] regra planned x realized no motor
14. [x] investimentos unificados
15. [x] patrimônio unificado no motor
16. [x] disponível unificado no motor
17. [x] categorias consistentes
18. [x] séries/categorias futuras suportadas pelo motor
19. [ ] todos os filtros mensais sincronizados
20. [x] cards mobile clicáveis/teclado
21. [ ] todos os gráficos interativos
22. [ ] agenda integralmente ligada ao V10
23. [ ] conciliação integralmente ligada ao V10
24. [x] Caju separado do patrimônio/caixa
25. [x] dashboard mobile-first + navegação inferior
26. [x] KPIs mobile 2x2
27. [x] hierarquia mobile própria
28. [x] bottom navigation mobile
29. [x] Desktop/Mobile compartilham Store/Engine; CSS mobile isolado por media query
30. [x] identidade original preservada no tema current
31. [x] tema claro opcional; também current/dark
32. [ ] IA V10 consolidada
33. [ ] backend LLM
34. [ ] garantir nenhuma chave de IA pública
35. [ ] separar interpretação IA de execução
36. [ ] confirmação de operações sensíveis pela IA
37. [ ] Cloud Sync V10 consolidado
38. [ ] conflitos/revisões Desktop-Mobile
39. [ ] Service Worker/cache V10 consolidado
40. [ ] diagnóstico completo de dependências
41. [ ] build de produção consolidado
42. [ ] build portátil opcional
43. [x] testes unitários/regressão financeira no navegador
44. [x] regressões mensais base implementadas
45. [x] health/integridade estrutural
46. [ ] E2E real de UI
47. [ ] testes físicos Desktop/Mobile
48. [x] validação matemática base
49. [x] diagnóstico HealthV10 + resultados globais
50. [ ] remover de produção os r67/r68/r69/r70/r75/r80/r91 concorrentes

## Regra de homologação
Um item só é 100% homologado quando o código está implementado e o teste aplicável passa. Os itens 46/47 exigem execução real em navegador; inspeção estática não substitui clique E2E.
