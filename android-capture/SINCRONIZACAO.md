# Sincronização de lançamentos confirmados — Rev0 1.5.18

## Funcionamento

O APK mantém a base financeira no aparelho. A conexão privada permite receber inclusões confirmadas em uma fila remota e enviar capturas de IA/WhatsApp já revisadas no aplicativo. A base histórica completa, saldos iniciais e preferências não são enviados nem substituídos.

Ao iniciar, voltar ao primeiro plano, recuperar a internet ou arrastar para atualizar, o aplicativo consulta a fila. Também consulta a cada minuto enquanto está aberto. Em Configurações → Captura, WhatsApp e IA há um botão para sincronizar e a informação da última tentativa. Fora de conexão, os registros existentes continuam disponíveis.

A fila usa identificadores imutáveis, centavos inteiros, validação de datas/contas/categorias, paginação e autenticação separada da chave do provedor de IA. O cursor é gravado somente depois de o lançamento ser salvo. Repetições de entrega não criam outra despesa. Categorias ausentes e lançamentos semelhantes interrompem o lote para conferência, sem apagar registros locais. Compras Carbon respeitam o cálculo existente de competência da fatura.

## Ativação

1. Publicar as funções e o schema no deployment já utilizado pelo app. Todas as tabelas e rotas anteriores são preservadas; apenas `ledgerOperations` é adicionada.
2. Instalar a atualização com o mesmo pacote e certificado, sem desinstalar o aplicativo.
3. Configurar a conexão privada existente. É possível importar o arquivo JSON pessoal de conexão; ele não contém a chave OpenAI. O arquivo de conexão não deve ser publicado no GitHub.
4. Confirmar a sincronização por uma inclusão conhecida e verificar a contagem no aparelho. Teste em navegador com ponte simulada não equivale a teste no telefone.

Os endpoints `/ledger/submit` e `/ledger/changes` aceitam apenas POST autenticado com a chave privada do serviço. O usuário é derivado dessa chave no servidor; não é aceito um identificador de usuário enviado pelo cliente. As funções de banco são internas. Novas inclusões não exigem créditos OpenAI.

## Escopo desta etapa

- Inclui novas operações confirmadas; não espelha edições, exclusões, categorias ou saldos entre dispositivos.
- Não lê automaticamente conversas do ChatGPT. Cada lote precisa ser autorizado e enviado à API privada durante uma sessão de trabalho com acesso ao serviço.
- Esta fila é a base comum para a futura ativação do WhatsApp. Número, webhook, transcrição e mensagens externas continuam dependendo da configuração e de testes próprios; nenhuma mensagem é enviada por esta atualização.
- Rascunhos produzidos pela IA não são lançados sem revisão. Os registros de IA/WhatsApp já confirmados no app entram na fila ao sincronizar.
- Identificadores repetidos com dados diferentes são rejeitados. Correções financeiras devem ser feitas no app até haver um protocolo específico de edição.
- Backups existentes continuam necessários. Restaurações antigas e migração completa entre dispositivos exigem conciliação; esta fila não é um backup integral.

## Verificação

TypeScript e testes de backend, autenticação HTTP, isolamento por proprietário, repetição de operações, gravação local com falha, erro de cursor, modo offline, concorrência, troca de conexão e envio após confirmação. O workflow também verifica o motor financeiro, os gráficos, a navegação e a compilação nativa.
