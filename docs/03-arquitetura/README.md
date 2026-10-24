# Episódio 3 — Arquitetura

Como o Pulso foi construído e por quê. O app guarda e decide tudo; o n8n só dispara o ciclo a cada 5 minutos.

A mesma mensagem não sai duas vezes por duas camadas no banco: chave única na criação do job e reserva atômica antes do envio ([ADR-003](adr/ADR-003-idempotencia.md)).

Fora do horário comercial a mensagem espera na fila e sai na abertura seguinte. Falha do provedor tenta de novo após 1, 5 e 15 minutos (RN-11).

As decisões estão em nove ADRs, cada uma com alternativas, trade-off e "quando eu mudaria de ideia".

| Documento | O que contém | Itens |
|---|---|---|
| [01-modelo-de-dados.md](01-modelo-de-dados.md) | Modelo de dados e decisões que valem lembrar | - |
| [02-fluxo-da-automacao.md](02-fluxo-da-automacao.md) | Um ciclo, uma resposta chegando e os estados de um job | 3 seções |
| [03-componentes.md](03-componentes.md) | Camadas e regra de dependência | - |
| [04-seguranca-e-privacidade.md](04-seguranca-e-privacidade.md) | Autorização, validação, senhas, opt-out, LGPD básica e o que não está coberto | 8 seções |
| [05-modos-de-falha.md](05-modos-de-falha.md) | O que acontece e o que a pessoa vê em cada falha | 12 falhas |

## ADRs

| ADR | Decisão |
|---|---|
| [001](adr/ADR-001-n8n-ou-jobs-em-codigo.md) | n8n só como agendador; a lógica fica no código |
| [002](adr/ADR-002-provedor-de-mensagens.md) | Interface de provedor com adaptador simulado |
| [003](adr/ADR-003-idempotencia.md) | Idempotência por restrição única no banco |
| [004](adr/ADR-004-agendamento-e-fila.md) | Agendamento e fila fora do horário comercial |
| [005](adr/ADR-005-retentativa-e-falhas.md) | Retentativa com backoff e tratamento de falhas |
| [006](adr/ADR-006-etapas-configuraveis.md) | Etapas do funil configuráveis |
| [007](adr/ADR-007-validacao-do-webhook.md) | Validação do webhook (HMAC) |
| [008](adr/ADR-008-autenticacao.md) | Autenticação e papéis |
| [010](adr/ADR-010-sem-loading-tsx.md) | Sem `loading.tsx`: defeito que só aparecia no build de produção |

Não existe ADR-009; a numeração segue de 008 para 010.

[← Episódio 2: Definição](../02-definicao/README.md) · [Índice](../INDEX.md) · [Episódio 4: Protótipo →](../04-prototipo/README.md)
