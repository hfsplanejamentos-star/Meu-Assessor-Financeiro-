# Ativação da IA — Rev.0

O APK 1.5.13 prepara a ponte Android e o ditado de voz. Isso não significa que o serviço de produção já recebeu as novas rotas.

## Serviço existente

- HTTP: https://effervescent-marlin-88.convex.site
- Projeto/deployment anterior: effervescent-marlin-88.
- A chave OpenAI deve continuar somente no ambiente do servidor.

## Configuração privada necessária

1. No deployment correto do Convex, manter `OPENAI_API_KEY` configurada e cadastrar `ASSISTANT_SYNC_KEY`: uma chave privada de 32 a 256 caracteres ASCII, sem espaços, diferente da chave OpenAI.
2. Implantar o código desta branch no deployment autorizado, preservando as tabelas existentes. A rota `/integrations/status` e a autorização de `/ai/finance` só estarão ativas depois da implantação.
3. No APK, abrir Configurações → Captura, WhatsApp e IA. O endereço do serviço já vem preenchido; informar a mesma chave privada em “Chave de acesso”.
4. Conectar e verificar se a tela mostra “IA: configurada”. Isso verifica a configuração do servidor; depois fazer uma consulta curta para validar a resposta real do provedor.
5. Falar preenche a mensagem. Enviar para IA cria um rascunho. Salvar lançamento exige confirmação e mantém o motor local como responsável pela gravação.

Nunca publicar chaves no GitHub, no HTML ou em mensagens. O APK guarda a conexão com AES-GCM no Android Keystore, não exporta a chave no backup e recusa redirecionamentos e destinos fora de HTTPS Convex.

WhatsApp e áudio do WhatsApp continuam desativados. O ditado de voz usa o reconhecimento do Android. A integração de IA não faz sincronização automática da base financeira nem altera limites ou saldos do cartão.

## Evidências e limite da validação

Os testes usam respostas simuladas para conferir conexão, ditado, revisão e gravação explícita. Ativação no servidor, resposta real da OpenAI e reconhecimento em aparelho exigem a configuração privada e validação final; não devem ser anunciados como concluídos apenas pela compilação do APK.
