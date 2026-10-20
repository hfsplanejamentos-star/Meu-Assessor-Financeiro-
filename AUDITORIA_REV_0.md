# Auditoria inicial — Snake Finance Oficial Rev. 0

Data: 2026-10-20. Estado: **não homologado**.

## Achados verificados
1. `snake-finance-mobile.html` na raiz e `android-capture/app/src/main/assets/snake-finance-mobile.html` têm o mesmo blob SHA `0cb88ee5ad20a2e6e8abe077d8f0e354c17a54a9` nesta branch. A duplicidade física existe, embora o conteúdo atual seja idêntico.
2. O HTML incorporado à branch de correções `fix/capture-diagnostics-privacy-20261017` é diferente (blob `c46d6339d6a3f252e96a3bce82746cc85061093a`) e contém as referências textuais `Despesas Prev. + Faturas` e `XP Infinite One`. **Não foi promovido** à Rev. 0 por falta de validação visual.
3. `MainActivity.loadDashboardHtml()` nesta base prioriza cache, depois o HTML incorporado, e ainda tenta substituir o painel com HTML remoto (`APP_URL`). Isso explica risco concreto de carregar uma versão diferente da empacotada.
4. O `build.gradle.kts` base usa `applicationId = "br.com.snakefinance.app"`, `versionName = "1.5.7"`. Compilar e instalar esse ID pode afetar a instalação original; **não distribuir esta branch como APK de teste sem flavor isolado**.
5. O build requer `Snake_Finance_Splash_Original_Android.zip` com `snake_splash_aprovada.jpg`. A verificação de presença e fidelidade visual ainda está pendente.
6. A branch de correções inclui flavor `validation2`, mas isso **não prova** que todos os ajustes nela são aprovados ou que o APK restaura a base financeira real.

## Decisões de segurança
- Preservar `backup/base-original-codigo-2026-10-14` e `main` até homologação.
- Não excluir branches ou arquivos, nem renomear o repositório remoto, antes do inventário e da revisão de dependências.
- Tratar `snake-finance-oficial-rev-0` como linha de consolidação; **não como APK definitivo**.
- Antes do build de teste, criar ID de aplicativo isolado, desabilitar substituição remota do HTML, registrar a versão de asset e testar persistência do WebView.
- Não migrar nem zerar saldos sem exportação/restauração testada; não inventar valores.

## Critérios para homologação
- Comparação visual com o layout aprovado (incluindo splash, contas, cores, gráficos e quatro indicadores).
- Uma fonte de HTML para build, com controle de versão explícito.
- Testes de integridade dos dados, deduplicação, faturas, projeção, Caju e saldo C6+XP.
- APK isolado, build CI verde e validação em dispositivo.
