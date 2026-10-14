# Identidade visual congelada — Snake Finance / Assessor IA Mobile

## Objetivo
O **Assessor IA é um APK separado**, conectado em modo autenticado aos mesmos dados do Snake Finance. O Snake Finance continua sendo a fonte financeira principal. O WhatsApp é um canal posterior, fora do escopo de conclusão do APK IA.

## Fonte de inspiração e aprovações
- Referência funcional e geométrica: `snake-finance-mobile.html` (cards compactos com raio de **18px**, tipografia system-ui, espaçamentos simétricos e navegação inferior).
- Referência de composição e acabamento: imagem de três telas do Assessor IA previamente **aprovada pelo usuário**.
- Temas preservados: **Dourado (padrão)**, **Limão**, **Branco**. Não introduzir tema Ciano nesta versão.
- A versão atual utiliza fundo `#090a08`, superfícies `#191b19`, `#262722`, detalhes `#f3c454` e texto claro, com limão `#b8ff2c`. Branco usa superfícies claras.
- Cards com contornos discretos e bordas 16–18px, ícones vetoriais embutidos, menu inferior flutuante com botão central do Assessor IA, espaços compactos e tipografia legível.
- Nenhuma alteração visual deve ser considerada aprovada sem **imagem real/renderizada para avaliação**. A prévia ilustrativa do conceito não substitui captura do APK no Android.

## Ajustes da rodada
- Removido relógio, sinal e bateria fictícios do cabeçalho HTML. O Android usa a barra nativa do dispositivo, não uma imagem de screenshot.
- Unificados ícones por símbolos SVG locais, sem carregar biblioteca de rede.
- Despesas por categoria e barra de receitas/despesas agora usam **somente lançamentos reais do mês** para seus percentuais; sem cor falsa quando não há base confirmada.
- O total de porcentagens das categorias fecha 100% pelo método dos maiores restos.
- Ao desconectar o financeiro, saldos e gráficos são ocultados, sem reaproveitar valores em cache.
- O APK de prévia mantém `SNAKE_ASSESSOR_PREVIEW_ONLY`; confirmação de despesas e alterações financeiras permanecem bloqueadas.

## Portas de entrega do APK
1. Executar `npm run test:assessor`, incluindo `assessor-visual-parity.test.cjs` e `assessor-finance-graphics.test.cjs`.
2. Gerar HTML único atualizado via `npm run build:assessor-html`; validar `npm run check:assessor-html`.
3. Compilar APK Android debug isolado; verificar resultado real da compilação, hash e instalação sem substituir o Snake Finance.
4. Capturar **screenshots do APK efetivamente instalado** nas telas Início, Chat, Agenda, Configurações e revisar contra a composição aprovada.
5. Testar autenticação, permissão de notificações, leitura de contas, áudio/foto/PDF e ausência de lançamentos automáticos.
6. Validar sincronização financeira, idempotência e saldos com versão estável antes de liberar qualquer operação de escrita.

**Status:** HTML atualizado e auditorias isoladas de visual/JS passaram; compilação, Android físico e sincronização ponta a ponta ainda sem aprovação confirmada. Não fazer merge da PR de testes nem publicar release automaticamente.
