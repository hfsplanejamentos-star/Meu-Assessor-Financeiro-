# Validação — WhatsApp oficial do Assessor IA

**Situação:** preparação e testes simulados; a linha nova ainda não está ativada na WhatsApp Business Platform. Nenhuma integração de WhatsApp webhook está implantada ou habilitada.

## Arquitetura definida

- **Snake Finance:** sistema financeiro principal e fonte única de lançamentos, saldos, cartões, faturas e investimentos.
- **Assessor IA (APK independente):** conversa inteligente, análise de documentos, agenda e revisão individual.
- **WhatsApp:** terceiro *canal de comunicação*, utilizando um número novo dedicado ao atendimento do Assessor IA; **não** será uma base financeira separada.
- Os três devem consultar a mesma base após autenticação e validação. Um único lançamento confirmado precisa aparecer no Snake Finance e no Assessor IA, sem repetição.

## Linha nova / conta Meta

1. Adquirir número dedicado apto a receber **SMS ou ligação de confirmação**. Não publicar o número completo ou códigos de autenticação no GitHub.
2. Criar/configurar portfolio Meta Business, WhatsApp Business Account (WABA) e o aplicativo Cloud API oficial da Meta.
3. Confirmar titularidade do número e habilitar verificação em duas etapas conforme a Meta.
4. Configurar HTTPS webhook com validação de assinatura `X-Hub-Signature-256` e segredo de verificação, sem registrar esses segredos no repositório.
5. Inscrever a WABA para eventos de mensagem e testar inicialmente com número/ambiente de testes da Meta.
6. Habilitar o número comprado somente após testes e aprovação; validar eventuais exigências de perfil comercial e cobrança.

**Não confundir:** o método Android `shareWhatsApp` atual abre o WhatsApp para compartilhar um texto, mas **não** constitui integração da API para receber mensagens, voz ou documentos.

## Protocolo de segurança e conciliação

- Restrição por número remetente autorizado e sessão vinculada ao dono da chave financeira; receber uma mensagem de qualquer pessoa **não** autoriza consulta a saldos ou lançamento.
- Validar assinatura do webhook **antes** de processar conteúdo. Verificação inicial por desafio GET + checagem de token; POST com HMAC SHA-256 usando bytes originais e constante de comparação, sem confiar em campos de origem não autenticados.
- Deduplicar pelo **identificador de mensagem da Meta (wamid)**, não por quantia. Dois Pix de mesmo valor podem ser transações diferentes.
- Processar texto, áudio, foto e documento por fila de revisão; mídia exige acesso autorizado ao arquivo e limites de tamanho/tipo; não baixar arquivos de terceiros sem confirmação.
- Transcrever/interpretar → retornar prévia com **valor, tipo, conta, meio de pagamento, categoria, descrição, data e favorecido** → só registrar após mensagem de confirmação explícita.
- Ao receber `SIM`, verificar que existe **exatamente uma** prévia pendente na sessão e que não expirou; caso contrário exigir escolha da movimentação. Negar reenvio/duplicação por retries e cliques repetidos.
- Fluxos Caju, C6 Carbon, parcelamento, investimentos, transferências e recorrências exigem adaptador próprio. Nunca lançar esses casos pela rotina simplificada de conta corrente.
- Webhook e erros não devem escrever saldo. A sincronização financeira ocorre por rotina transacional idempotente validada.
- **Alertas enviados pelo assessor:** exigem autorização prévia e configuração dos modelos aprovados da Meta quando enviados fora da janela de atendimento. Não prometer entrega automática sem templates/aprovação.
- Não armazenar segredos/tokens, números completos, fotos nem documentos brutos em logs públicos. Definir prazo de retenção e mecanismos de exclusão.

## Critérios de homologação com ambiente de testes

| Caso | Resultado esperado |
|---|---|
| "Gastei R$ 78 de combustível no C6" | Confirmação do gasto com dados editáveis; nenhum lançamento antes da aprovação |
| Áudio de despesa | Transcrição → confirmação do texto → prévia → aprovação |
| Foto ou extrato PDF | Extrair itens e revisar um por vez; não lançar em lote automaticamente |
| Dois Pix R$ 50 iguais com IDs diferentes | Duas sugestões separadas |
| Reentrega da mesma mensagem `wamid` | Exatamente uma sugestão, sem segundo lançamento |
| Remetente não autorizado | Nenhum saldo/dado pessoal retornado |
| "Quanto gastei de cerveja este mês?" | Resposta a partir dos dados financeiros reais; não inventar valores |
| Confirmação "SIM" sem item pendente | Não lançar; pedir esclarecimento |
| Notificação de fatura e saldo insuficiente | Enviar só com opt-in e conforme políticas de mensagem da Meta |
| Falha de rede depois de confirmação | Consultar o status do ID antes de tentar reprocessar |

## Restrições de lançamento

**Fase 1:** simular webhook, assinatura, autorização, parse e idempotência sem número novo e sem modificar financeiro real.

**Fase 2:** após ativação do número Meta, validar recepção de mensagens e tipos de mídia com usuário autorizado.

**Fase 3:** homologar respostas, modelos de alerta, custos, retries, sincronização bidirecional e auditoria de saldos antes de habilitar lançamentos.

**Prioridade:** concluir o APK de validação do Assessor IA primeiro; não ampliar o escopo visual aprovado nesta integração.

Referências oficiais:
- Cloud API Meta: https://developers.facebook.com/docs/whatsapp/cloud-api/
- Documentação oficial Meta na coleção Postman: https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api
- Política de mensagens: https://whatsappbusiness.com/policy/
