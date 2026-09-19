# V10 — Item 19 concluído

- [x] **19 Todos os filtros de mês sincronizados.**
- Um controlador único observa `.month-filter`, `#globalMonthFilter` e selects com `data-month-scope`.
- A alteração de qualquer filtro atualiza `activeMonth`, replica o mês nos demais filtros que possuem a opção e solicita somente um render pelo `RenderControllerV10`.
- Proteção de reentrada evita loops entre filtros.
- Filtros são reabilitados e permanecem clicáveis.
- Evento `v10-month-changed` disponibiliza o mês selecionado aos módulos V10.
