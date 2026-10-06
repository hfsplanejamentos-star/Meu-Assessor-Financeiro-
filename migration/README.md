# Migração Mobile v82 — primeira etapa

A base financeira v82 foi validada pelo proprietário. Esta branch inicia a adaptação do Android existente e dos serviços Convex existentes. Não substitui a versão publicada automaticamente.

## Implementado nesta etapa

- Empacotamento local do HTML validado com checksum SHA-256. O Android prioriza esse pacote, mantendo a origem HTTPS anterior para o armazenamento WebView. Sem pacote, preserva o carregamento anterior.
- Interface de revisão das notificações capturadas: título, texto, valor e confirmação individual. A opção de ocultar valores é respeitada. Novas notificações não são removidas ao revisar uma anterior. Não cria lançamentos automaticamente.
- Fila Android com trava compartilhada entre instâncias, gravação atômica e confirmação por IDs. Ao atingir 500 itens, recusa novos itens em vez de apagar pendências antigas.
- WhatsApp Cloud API: validação inicial do webhook, assinatura HMAC do corpo original, restrição ao remetente e número empresarial configurados. Somente texto nesta etapa; áudio, foto e respostas estão pendentes.
- Caixa de entrada Convex separada do livro financeiro; repetição do mesmo messageId é ignorada por proprietário. Consulta autenticada `/whatsapp/messages`, limitada a 50 pendências. Ainda não há tela de confirmação de mensagens nem conclusão dessas pendências.
- IA existente: `store:false` nas duas chamadas OpenAI, modelo financeiro configurável, limites do pedido, erro para JSON inválido e timeout de rede. Chaves permanecem no servidor.

## Empacotar privadamente

```sh
npm ci
npm run stage:mobile -- /caminho/absoluto/Snake_Finance_Mobile_v82_Candidata_Auditada.html
npm run typecheck
npm run test:backend
npm run test:migration
cd android-capture
gradle testDebugUnitTest assembleDebug
```

O HTML contém dados financeiros e está excluído do git. Nunca faça commit ou upload público do pacote, backup, manifest de dados ou APK que o inclua. O CI do repositório público, sem esse pacote, continua produzindo o app com o painel anterior. O pacote distribuível sem dados iniciais já foi preparado na etapa Android 1.4.0 abaixo.

## Configuração do servidor

Definir as variáveis no ambiente Convex, sem colocá-las no HTML:

- `OPENAI_API_KEY`; opcional `OPENAI_FINANCE_MODEL` e `OPENAI_CLASSIFICATION_MODEL`.
- `WHATSAPP_VERIFY_TOKEN`: token de verificação escolhido para o webhook.
- `WHATSAPP_APP_SECRET`: segredo do aplicativo Meta usado na assinatura.
- `WHATSAPP_PHONE_NUMBER_ID`: ID do número empresarial receptor.
- `WHATSAPP_OWNER_PHONE`: remetente autorizado, apenas dígitos com DDI.
- `WHATSAPP_OWNER_SYNC_KEY`: a mesma chave de sincronização do proprietário, 32–256 caracteres. Esta primeira etapa atende um proprietário; expansão exige vínculo autenticado entre conta e telefone.
- `ALLOWED_WEB_ORIGIN`: a origem HTTPS do painel atual.

Registrar na Meta `https://<deployment>.convex.site/whatsapp/webhook`. É necessário possuir a conta empresarial e o número habilitado para Cloud API. O webhook não envia mensagens nem registra despesas; o recebimento é uma pendência a revisar.

## Verificação e limites

TypeScript, classificação existente, verificações estáticas de segurança e testes de assinatura/isolamento do WhatsApp passaram. Testes do HTML confirmaram exclusão/cancelamento de metas, persistência, tela vazia e ausência de alterações financeiras. O adaptador foi exercitado com uma ponte Android simulada, incluindo chegada de outra notificação durante a revisão.

A compilação inicial do Android passou no CI. Este ambiente local não tem SDK Android nem Gradle. A captura nativa, criptografia/AtomicFile, biometria e migração entre versões ainda exigem compilação e teste em aparelho. O backend não foi implantado e não houve teste com mensagens reais ou chamadas pagas de IA.

## Próxima etapa antes de substituir o aplicativo

1. Importar o backup completo v2 e conferir saldos e metas no Android.
2. Compilar APK com a mesma identificação e assinatura do instalado; testar atualização sem desinstalar e validar recuperação do backup.
3. Conectar credenciais Convex/Meta/OpenAI e validar primeiro com número de teste.
4. Criar revisão/efetivação de mensagens recebidas, com deduplicação pelo ID da origem e confirmação antes de lançar.
5. Adaptar conversa da IA aos dados mínimos necessários e validar sugestões antes de salvar.
6. Implementar avisos locais agendados/push, permissão no Android e preferências por regra. A captura de notificações bancárias já existe; os lembretes emitidos pelo assessor são trabalho distinto e ainda estão pendentes.

Referências primárias: [Android WebView](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content), [OpenAI Responses](https://developers.openai.com/api/docs/guides/migrate-to-responses), [Meta Cloud API](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api).

## Android 1.4.0 — pacote candidato

O APK agora inclui `dashboard-mobile.html`, sem lançamentos, saldos iniciais, orçamentos ou metas pessoais no código. Mantém o applicationId e eleva versionCode para 21. O CI cria artefatos de teste; se os segredos de assinatura já estiverem configurados, também cria a versão release assinada, sem publicar uma release nem atualizar o app anterior automaticamente.

Antes de instalar, abra o HTML atualizado no celular e use Configurações → Backup e importação → Exportar backup completo. O formato v2 inclui saldos iniciais e as configurações efetivamente usadas, mesmo quando nunca foram alteradas. No APK, importe esse JSON e confira os saldos e metas. Backups antigos sem saldos iniciais são recusados no pacote distribuível para evitar uma migração financeira incompleta.

O Android agora salva o backup usando o seletor de arquivos do sistema. A importação de JSON não abre câmera nem dispara OCR. O botão Voltar primeiro fecha o formulário/menu aberto e depois retorna à visão Geral. O fluxo de receita/despesa inclui o recolhimento automático do botão + após salvar.

A atualização sobre o app instalado depende da mesma assinatura. Um APK debug não substitui um app release assinado. O teste final de instalação, importação, biometria e captura continua sendo feito no aparelho; compile/CI não comprovam esses comportamentos no dispositivo.


## Android 1.4.1 — instalação em paralelo

Após o Android recusar a atualização por conflito de pacote, o sucessor passa a usar applicationId `br.com.snakefinance.mobile` e nome Snake Finance. A causa exata do conflito no aparelho não foi identificada; não se afirma que uma assinatura específica estava errada. O novo pacote instala separadamente do Meu Assessor antigo, preservando o predecessor como backup. Namespace Java e dados nativos ficam válidos dentro do novo applicationId.

O armazenamento de cada aplicativo é separado. Exporte o backup v2 pelo HTML atualizado e importe no Snake Finance. Será necessário habilitar o acesso às notificações para o novo app. O feed de atualização do predecessor não é mais consultado pelo sucessor; uma URL própria deverá ser configurada depois da publicação.

Versão: 1.4.1, versionCode 22. A 1.4.0 não deve ser usada para tentar substituir novamente o app instalado. O objetivo desta candidata é validar instalação em paralelo, importação de dados e captura no dispositivo.


## Android 1.4.2 — imagem aprovada do ícone

Substitui a letra S genérica pela imagem original fornecida pelo proprietário: S em fita dourada, barras e wordmark Snake Finance. O PNG é copiado byte a byte para drawable-nodpi/snake_logo_approved.png, sem geração ou recriação. O recurso do launcher centraliza a imagem inteira, respeita sua proporção e inclui margem para o recorte adaptativo do Android. Mantém o pacote separado br.com.snakefinance.mobile e a migração por backup v2.


## Android 1.4.3 — abertura enquanto o painel carrega

Usa uma arte de abertura adaptada da referência aprovada: fundo preto, marca dourada e ondas inferiores, sem a moldura e os controles da captura. A arte foi preparada com edição de imagem e é distinta do PNG original do ícone, que permanece intacto. A sobreposição nativa é visível antes da autenticação e durante a carga do painel; o WebView carrega por trás. Depois de onPageFinished, scripts iniciais concluídos e dois frames nativos, revela o painel sem temporizador fixo. Em erro de navegação principal, mantém a abertura e oferece nova tentativa. Estado restaurado inválido volta ao bundle local.

Versão 1.4.3, versionCode 24, mesmo pacote separado e assinatura da 1.4.2. Nenhuma alteração de motor financeiro ou dados. Exibição, biometria e transição ainda exigem conferência no aparelho.
