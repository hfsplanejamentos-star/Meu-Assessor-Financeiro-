# Assessor IA — integração Android e APK de validação

## O que foi implementado
- O listener Android aceita apenas C6, Caju, Itaú e XP. Exclui explicitamente Google Wallet, Google Pay e os outros bancos, inclusive em preferências antigas.
- Identidade da notificação é calculada com chave nativa, timestamp exato, banco e conteúdo. Não deduplicar por valor, descrição ou minuto.
- A fila nativa continua criptografada. `assessor-mobile-notifications.js` **lê** a fila e cria rascunhos de revisão; leitura, abertura da tela e notificações novas **não confirmam nem lançam despesas**.
- O assessor exige a escolha/validação da conta, valor, tipo (receita ou despesa), meio de pagamento, categoria, data e descrição.
- O ID original segue em `sourceId` para a API `/assessor/drafts`, evitando repetir operações já registradas na nuvem.
- Após lançamento confirmado no ledger, o assessor solicita a remoção apenas daquele ID da fila Android. Em caso de falha, mantém o evento para conciliação, sem segundo desconto automático.
- Descarte sem lançamento exige confirmação explícita; valores idênticos em eventos diferentes permanecem separados.
- Caju, C6 Carbon, XP e outros casos especiais continuam fora do adaptador genérico de saldo de conta corrente.

## APK de teste — proteção do aplicativo principal
- O **debug** usa aplicação própria `br.com.snakefinance.app.ia.preview`, instalada ao lado do Snake Finance, sem substituir seu APK e banco local.
- O pacote debug gera uma cópia embutida do HTML aprovado e dos módulos JS, preservando o tema Dourado e os botões de chat, áudio, foto e PDF.
- A variável `SNAKE_ASSESSOR_PREVIEW_ONLY=true` bloqueia gravações de despesas e correções de cadastro no aplicativo de testes; somente leitura, prévias e revisão de notificações ficam disponíveis.
- A proteção agora também é aplicada no `assessor-mobile-api.js`: `prepare`, `confirm`, `reject`, `postCash` e reparos do cartão não acessam as rotas de escrita enquanto a prévia estiver ativa.
- Links externos abertos a partir da prévia não navegam dentro do WebView que contém a ponte nativa; são encaminhados ao navegador externo.
- O seletor de arquivos da prévia aceita somente imagens JPG/PNG/WebP, PDF, CSV, TXT e OFX; o app estável conserva sua configuração anterior.
- No GitHub Actions, após conclusão **bem-sucedida** do job `android-native`, o artefato é salvo como `Snake-Finance-Assessor-IA-preview-only` por até sete dias. Isso não significa que a compilação já tenha ocorrido ou que o APK esteja disponível neste momento.

- O **release** conserva o identificador `br.com.snakefinance.app`, o processo anterior de backup/cache e sua URL estável; não foi alterado para abrir a página de desenvolvimento.
- Comandos de compilação em um ambiente Android SDK/Gradle configurado:
  `cd android-capture && gradle --no-daemon :app:testDebugUnitTest :app:assembleDebug`.
- Artefato **esperado após compilação bem-sucedida**, ainda não verificado: `android-capture/app/build/outputs/apk/debug/app-debug.apk`. Não disponibilizar download antes de o arquivo existir e ser testado.
- Para baixar após uma execução de CI aprovada: abrir **GitHub → Actions → Assessor IA checks → execução bem-sucedida → Artifacts → Snake-Finance-Assessor-IA-preview-only**. O arquivo resultante deve ser verificado no celular antes de qualquer migração.

- A pipeline `.github/workflows/assessor-ci.yml` foi configurada para verificar módulos, lógica e compilação Android, porém o resultado da execução completa não foi confirmado neste atendimento.

## Checklist de homologação física
1. Instalar debug ao lado do aplicativo estável e confirmar que nenhum dado do estável foi substituído.
2. Ativar permissão de leitura de notificações no app de testes; permitir apenas os quatro apps financeiros.
3. Efetuar dois Pix de valores iguais e destinatários distintos; conferir duas prévias separadas sem dedução automática.
4. Verificar que a notificação do Google Wallet/Pay não é capturada nem armazenada como texto sensível.
5. Receber entrada Pix; conferir direção "Receita", corrigir conta e categoria manualmente.
6. Receber despesa Caju e compra no C6 Carbon; verificar bloqueio do lançamento em conta corrente comum.
7. Confirmar que nenhuma despesa entra no saldo real enquanto o APK estiver em modo de testes.
8. Testar áudio, foto e PDF com permissão explícita; não assumir funcionamento sem API de IA configurada.
9. Só depois da auditoria completa do motor financeiro, sincronização Mobile/Desktop e autorização explícita, considerar liberação de um APK operacional.

**Importante:** Não houve implantação de novas rotas no Convex nem compilação de APK confirmada neste fluxo; o resultado até aqui é código de desenvolvimento e testes isolados.
