# Backend seguro · Passo 2

O backend recebe a fila criptografada do módulo Android por HTTPS, valida a origem, elimina duplicidades e classifica cada movimentação.

## Rotas

- `POST /notifications/ingest`: recebe de 1 a 50 notificações.
- `GET /notifications/changes?since=<epoch-ms>&limit=50`: entrega mudanças para o dashboard.
- As duas rotas exigem `X-Sync-Key` com pelo menos 32 caracteres.

A chave original não é gravada nas tabelas de notificações. O servidor deriva um identificador SHA-256 isolado para cada usuário.

## Variáveis do deployment

- `OPENAI_API_KEY`: habilita a classificação por IA dos casos não resolvidos pelas regras locais.
- `OPENAI_CLASSIFICATION_MODEL`: opcional; padrão `gpt-5-mini`.
- `ALLOWED_WEB_ORIGIN`: opcional; padrão `https://hfsplanejamentos-star.github.io`.

Sem `OPENAI_API_KEY`, o backend permanece operacional: casos conhecidos são classificados por regras e casos incertos ficam como `needs_review`.

## Validação

```bash
npm install
npm run typecheck
npm run test:backend
```

Para ativar em um deployment Convex autorizado:

```bash
npx convex env set OPENAI_API_KEY '<chave-servidor>'
npx convex deploy
```

Nunca coloque a chave da OpenAI no aplicativo Android, HTML, repositório ou `localStorage`.


## Integração Assessor IA / WhatsApp Cloud API — preparada, não ativada

O Snake Finance usa a **API da OpenAI** no servidor Convex; isso não transfere
automaticamente esta conversa do ChatGPT nem vincula a assinatura do ChatGPT a
uma chave de API. O app Android armazena só a credencial de conexão pessoal em
**Android Keystore (AES-GCM)**. A chave OpenAI e os tokens da Meta nunca vão
para o APK ou para o repositório.

### Configuração do Convex (somente secrets/env do deployment)

Configure, fora do chat e do GitHub, as seguintes variáveis:

| Variável | Finalidade |
|---|---|
| `SNAKE_ACCESS_KEY` | Segredo pessoal forte e único (mínimo 32 caracteres), que o app usará em `X-Sync-Key`; sem ele o backend bloqueia acesso |
| `OPENAI_API_KEY` | Chave API da OpenAI, cobrada separadamente da assinatura ChatGPT |
| `WHATSAPP_VERIFY_TOKEN` | Valor secreto para o desafio GET de verificação do webhook Meta |
| `WHATSAPP_APP_SECRET` | App Secret da Meta, verifica `X-Hub-Signature-256` dos eventos |
| `WHATSAPP_ALLOWED_FROM` | Seu telefone autorizado, com DDI e DDD, somente dígitos |
| `WHATSAPP_ACCESS_TOKEN` | Token Meta com autorização de mídia para transcrever áudio |
| `OPENAI_TRANSCRIPTION_MODEL` | Opcional, padrão `gpt-4o-mini-transcribe` |
| `ALLOWED_WEB_ORIGIN` | Origem web permitida para CORS, padrão GitHub Pages do projeto |

Crie uma conta Meta for Developers e um WhatsApp Business Platform/Cloud API
com número habilitado. A Meta deverá verificar o endereço HTTPS gerado pela
implantação Convex terminando em `/whatsapp/webhook`. Inscreva o campo
`messages`. Use a mesma credencial `SNAKE_ACCESS_KEY` no app em
**Configurações → Captura, WhatsApp e IA → Conectar e verificar**.

### Protocolo e testes

- `GET /integrations/status`: mostra recursos configurados (sem revelar segredos).
- `GET /whatsapp/webhook`: responde ao desafio da Meta com token verificado.
- `POST /whatsapp/webhook`: valida HMAC SHA-256, remetente permitido e IDs
  únicos; aceita texto e áudio. Não lança nenhuma despesa automaticamente.
- `GET /whatsapp/messages`: lista mensagens aguardando revisão e transcrições.
- `POST /whatsapp/resolve`: marca evento como registrado ou dispensado.
- `POST /whatsapp/retry`: retenta áudio com falha sem apagar a mensagem.
- `POST /ai/finance`: IA interpreta perguntas e propõe rascunhos de transações.

O servidor encaminha áudio permitido para transcrição via API OpenAI e só
apresenta o texto para confirmação. **Ainda não existe envio automático de
mensagens WhatsApp, agendamento do briefing com dados reais, nem alertas
externos com o app fechado.** Para mensagens proativas pela Meta fora da
janela de atendimento, serão necessários modelos de mensagem aprovados.

A implantação foi colocada em workflow de **execução manual**, com verificação
TypeScript, auditoria de segurança e testes. Não acione produção sem
configuração segura, revisão de privacidade e autorização explícita.

Não copie chaves, tokens, senhas ou extratos para issues, commits ou conversas.
