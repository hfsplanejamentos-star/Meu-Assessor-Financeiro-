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

O HTML contém dados financeiros e está excluído do git. Nunca faça commit ou upload público do pacote, backup, manifest de dados ou APK que o inclua. O CI do repositório público, sem esse pacote, continua produzindo o app com o painel anterior. Para um APK distribuível, a próxima etapa deve separar os dados iniciais do HTML e importá-los do backup privado.

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

O APK não foi compilado aqui: este ambiente não tem SDK Android nem Gradle. A captura nativa, criptografia/AtomicFile, biometria e migração entre versões ainda exigem compilação e teste em aparelho. O backend não foi implantado e não houve teste com mensagens reais ou chamadas pagas de IA.

## Próxima etapa antes de substituir o aplicativo

1. Separar os dados privados do pacote e migrar/importar backup completo, conferindo saldos e metas no Android.
2. Compilar APK com a mesma identificação e assinatura do instalado; testar atualização sem desinstalar e validar recuperação do backup.
3. Conectar credenciais Convex/Meta/OpenAI e validar primeiro com número de teste.
4. Criar revisão/efetivação de mensagens recebidas, com deduplicação pelo ID da origem e confirmação antes de lançar.
5. Adaptar conversa da IA aos dados mínimos necessários e validar sugestões antes de salvar.
6. Implementar avisos locais agendados/push, permissão no Android e preferências por regra. A captura de notificações bancárias já existe; os lembretes emitidos pelo assessor são trabalho distinto e ainda estão pendentes.

Referências primárias: [Android WebView](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content), [OpenAI Responses](https://developers.openai.com/api/docs/guides/migrate-to-responses), [Meta Cloud API](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api).
