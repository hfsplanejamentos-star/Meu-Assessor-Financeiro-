# Meu Assessor · Captura Android

Módulo nativo da Atualização 1. Ele observa somente notificações dos aplicativos bancários autorizados, identifica movimentações com valor em reais e mantém uma fila local criptografada.

## Privacidade e segurança

- O acesso é concedido e pode ser revogado nas configurações do Android.
- Notificações de aplicativos fora da lista autorizada são ignoradas.
- Mensagens sem valor monetário e sem indício de movimentação são ignoradas.
- A fila usa AES-256-GCM com chave não exportável no Android Keystore.
- Há deduplicação local por origem, conteúdo, valor e minuto da notificação.
- Nesta etapa não existe transmissão pela internet.

## Abrir e testar

1. Abra a pasta `android-capture` no Android Studio.
2. Aguarde a sincronização do Gradle e execute no aparelho Android 8 ou superior.
3. Toque em **Autorizar acesso às notificações**.
4. Ative **Meu Assessor · Captura** na tela do sistema.
5. Uma notificação financeira compatível incrementará o contador local.

O envio seguro ao backend e o consumo dessa fila pelo dashboard pertencem às Atualizações 2 e 3.
