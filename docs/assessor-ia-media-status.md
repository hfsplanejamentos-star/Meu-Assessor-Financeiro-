# Assessor IA Mobile — Mídia e voz (desenvolvimento)

## Rotas adicionadas
- `POST /assessor/analyze-attachment`: analisa 1 arquivo após ação explícita do usuário. Formatos PDF, JPG, PNG, WebP, TXT, CSV e OFX. Tamanho máximo: 4 MB.
- `POST /assessor/transcribe`: transcreve áudio enviado após consentimento. Formatos WebM, OGG, MP3, WAV e MP4. Tamanho máximo: 4 MB.
- Ambos exigem `X-Sync-Key` válido e compartilham quota específica de 20 análises de mídia por hora por chave.
- Os arquivos são encaminhados à API de IA configurada. Não são persistidos como documentos no banco Convex por essas rotas. O tratamento dos arquivos pelo provedor segue as políticas do provedor, não se deve prometer ausência absoluta de retenção.

## Fluxo de importação
1. Selecionar arquivo.
2. Exibir aviso de envio ao serviço de IA; analisar apenas após toque em `Analisar arquivo`.
3. Extrair movimentações como sugestões, com datas, valores, descrições e categorias.
4. Mostrar cada movimentação para revisão, editar conta, categoria, meio de pagamento e data.
5. Só registrar após confirmação explícita e somente se houver adaptador financeiro seguro para a conta.
6. Caju, XP, C6 Carbon, crédito e parcelamento continuam bloqueados para a rotina simplificada de débito em conta.

## Regras de segurança
- Nunca deduplicar apenas por valor. O identificador de origem do documento e o índice da linha ajudam a detectar reimportação do mesmo arquivo; **não garantem conciliação entre diferentes fontes**.
- Nenhum item de arquivo é lançado em lote.
- Áudio transcrito apenas preenche o campo para conferência; o usuário ainda precisa tocar em Enviar e Confirmar.
- Limitar arquivos grandes ou incompatíveis; não aceitar XLSX, vídeo ou outros formatos sem implementação dedicada.
- Uma falha de rede após gravação requer conciliação do status, não repetir o desconto automaticamente.

## Verificações
`npm run typecheck`
`npm run test:assessor`

O workflow GitHub Actions foi configurado na branch, mas os resultados da execução automatizada ainda precisam ser confirmados. Não implantar ou gerar APK definitivo antes do teste completo em Android/Convex de desenvolvimento.

## Dependências ainda pendentes
- Configuração e teste de `OPENAI_API_KEY` no ambiente do Convex.
- Validação real de arquivos, áudio e endpoints em ambiente de desenvolvimento.
- Adaptadores Caju e Carbon, compra parcelada, reconciliação entre fontes diferentes, agenda Teams/Google e notificações Android.
- Auditoria completa dos saldos, recorrências, gráficos e sincronização Mobile/Desktop.
