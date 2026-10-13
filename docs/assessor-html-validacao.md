# Assessor IA — HTML único de validação

## Arquivo
`Assessor_IA_Mobile_Validacao_Standalone.html` reúne a tela aprovada e os quatro módulos JavaScript em **um único HTML**, sem carregar scripts externos para exibir a interface.

- A proteção `SNAKE_ASSESSOR_PREVIEW_ONLY` é definida antes dos módulos e não pode ser alterada por scripts normais.
- **Lançamentos, confirmação de despesas e alteração de cartão ficam bloqueados.** Este arquivo não é um substituto do APK operacional.
- O visual usa os temas Dourado, Limão e Branco já aprovados. Os saldos reais só aparecem quando podem ser lidos e validados na fonte de dados; não há valores fictícios.
- A captura automática de notificações depende da ponte do APK Android. Abrir o HTML isolado no Chrome não concede acesso a notificações bancárias.

## Abrir no Chrome do celular
1. Acesse o arquivo no repositório, branch `feature/assessor-ia-mobile`.
2. Use **Download raw file** para salvar o `.html`.
3. No gerenciador de arquivos do celular, abra o arquivo com um navegador que permita páginas HTML locais.
4. Navegue por Início, Assessor IA, Agenda e Configurações. Teste o chat e a edição de prévias; **Salvar despesa** não altera o financeiro.

### Limitação de arquivo local (Origin: null)
Quando aberto como `file://`, o Chrome utiliza uma origem diferente da hospedagem oficial. O backend limita as rotas de IA, transcrição e análise de PDF/foto à origem HTTPS autorizada. Portanto, a versão local **não realiza essas análises online**. Uma mensagem explicativa aparece, sem enviar o arquivo ou áudio para a API. A consulta legada `GET /finance/state` pode funcionar com chave sincronizada, mas não equivale a integração completa de IA.

Para homologar essas funções, usar uma futura hospedagem autorizada via HTTPS e testar a API configurada. **Não** liberar `Origin: null` no backend como solução genérica nem modificar a página pública estável sem aprovação.

## Regerar e auditar no repositório
```bash
npm run build:assessor-html
npm run check:assessor-html
npm run test:assessor
```

O script `scripts/build-assessor-standalone.cjs` recria o arquivo a partir de `assessor-ia-mobile.html` e dos módulos, e `--check` recusa cópias desatualizadas. O workflow do GitHub verifica consistência e tenta disponibilizar um artefato HTML após testes de interface aprovados; não confundir a existência do código do workflow com uma execução bem-sucedida.

## Escopo pendente
- API de IA realmente implantada e testada em origem HTTPS;
- reconhecimento de áudio/foto/PDF em dispositivo real;
- conciliação de notificações e saldo entre Android, Mobile e Desktop;
- regras Caju/Carbon e aprovação final do APK definitivo.
