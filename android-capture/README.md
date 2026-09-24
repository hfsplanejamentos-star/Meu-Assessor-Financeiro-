# Meu Assessor Financeiro IA · APK híbrido

Aplicativo Android da **Versão Atual**. A V10 não é carregada.

## Recursos preparados

- Dashboard publicado aberto em WebView segura.
- Atualizações do site recebidas sem reinstalar o APK.
- Cache e armazenamento local do WebView para uso PWA/offline.
- Captura opcional de notificações bancárias autorizadas.
- Fila local criptografada com AES-256-GCM e Android Keystore.
- Ponte Android para comando de voz.
- Seleção de imagem/arquivo pelo próprio Android.
- Compartilhamento com WhatsApp.
- Ponte para entregar as notificações capturadas ao dashboard.
- Estrutura web existente para Assistente IA; credenciais nunca ficam no APK.
- Confirmação do usuário antes de gravar sugestões financeiras.

## Privacidade

A captura só funciona depois que o usuário abre **Configurar captura** e concede manualmente o acesso nas configurações do Android. Aplicativos fora da lista autorizada são ignorados. O conteúdo fica criptografado no aparelho até ser tratado pelo dashboard.

## Gerar o APK automaticamente

1. Abra a aba **Actions** do repositório.
2. Selecione **Build Android APK**.
3. Execute **Run workflow**.
4. Ao concluir, baixe o artefato **Meu-Assessor-Financeiro-IA-APK**.

O arquivo gerado é `Meu-Assessor-Financeiro-IA.apk`.

## Desenvolvimento local

Abra a pasta `android-capture` no Android Studio, sincronize o Gradle e execute em um aparelho Android 8 ou superior.

## Integrações externas

- A IA deve ser chamada por backend seguro; nenhuma chave de API deve ser embutida no aplicativo.
- A automação de mensagens recebidas pelo WhatsApp exige a API oficial WhatsApp Business/Meta e um backend configurado.
- O compartilhamento para o aplicativo WhatsApp já está disponível pela ponte Android.
