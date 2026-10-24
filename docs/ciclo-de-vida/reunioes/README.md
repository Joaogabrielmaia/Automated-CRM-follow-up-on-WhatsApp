# Reuniões e registros de discovery

[← Índice do ciclo de vida](../README.md) · [01 Visão e discovery](../01-visao-e-discovery.md)

Índice das atas do cenário, identificadas por papel dos participantes. Os registros são simulados; os documentos originais ficam em `docs/01-discovery` e `docs/04-prototipo` e não foram duplicados aqui.

| Reunião | Participantes (papéis) | Objetivo | Registro |
|---|---|---|---|
| Brainstorm e escolha da ideia | Responsável pelo produto | Escolher entre cinco ideias com matriz de decisão | [Brainstorm](../../01-discovery/01-brainstorm-e-escolha.md) |
| Discovery com o dono | Responsável pelo produto e dono (Admin) | Metas, volume de leads, onde se perde dinheiro, número usado no atendimento | [Registro do dono](../../01-discovery/03-registro-dono.md) |
| Discovery com a atendente | Responsável pelo produto e atendente | Dia a dia, onde o lead esfria, o que daria segurança | [Registro da atendente](../../01-discovery/04-registro-atendente.md) |
| Discovery com o cliente-tipo | Responsável pelo produto e cliente-tipo | O que incomoda depois do orçamento | [Registro do cliente](../../01-discovery/05-registro-cliente.md) |
| Validação do protótipo | Responsável pelo produto, dono, atendente e mestre de obras | Passar os wireframes pelas personas e decidir os pedidos | [Validação](../../04-prototipo/02-validacao-do-prototipo.md) |
| Planning, review e retrospectiva das sprints | Papéis Scrum | Conduzir o desenvolvimento | [Sprints](../sprints/README.md) |

## Registro de decisões originadas nas reuniões

| Decisão | Origem | Efeito | Regra ou ADR |
|---|---|---|---|
| Automático dentro de limites explícitos | Contradição na reunião com o dono | Horário comercial, no máximo 3 mensagens por ciclo, parada na resposta, opt-out, log | RN-01, RN-03, RN-04, RN-06 |
| Provedor de mensagens plugável | Restrição de número dedicado | Interface `MessageProvider` e adaptador simulado | [ADR-002](../../03-arquitetura/adr/ADR-002-provedor-de-mensagens.md) |
| Ação "criar tarefa" além de "enviar" | Restrição de número e pedido 10 da validação | O dono pode começar só com lembretes | RN-16 |
| Pausa por lead e "próximo passo da automação" | Pedidos 5 e 6 da validação | Mais controle para a atendente | RF-12, RN-10 |
| Recusa do chatbot e do envio fora do horário | Pedidos 2 e 3 da validação | Escopo protegido e regra mantida | RN-01 |
| Opt-out por palavra | Reunião com o cliente-tipo | SAIR, PARAR ou STOP | RN-03 |

## Solicitações por situação

| Situação | Pedidos da validação do protótipo |
|---|---|
| Aceitos (5) | 4 (em parte), 5, 6, 7, 10 |
| Adiados (3) | 1 (arrastar e soltar), 8 (previsão de receita), 9 (alerta por WhatsApp) |
| Recusados (2) | 2 (chatbot), 3 (mensagem às 22h) |
