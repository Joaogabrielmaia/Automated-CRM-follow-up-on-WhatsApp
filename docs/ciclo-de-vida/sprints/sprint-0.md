# Sprint 0 · Discovery e definição

[← Índice do ciclo de vida](../README.md) · [← Sprints](README.md) · [Sprint 1 →](sprint-1.md)

**Semanas do cenário:** 1 · **Objetivo:** Entender o problema comercial, escolher a ideia, definir requisitos, regras, arquitetura e validar o protótipo antes de codar.

## Escopo

Brainstorm e matriz de decisão; cenário e personas; três reuniões de discovery; processo atual; problemas P1 a P6; 20 RF, 9 RNF, 19 RN (a RN-18 foi acrescentada na Sprint 2 e a RN-19 na Sprint 4); 16 HU; riscos; ADRs; wireframes e validação com 10 pedidos.

## Entregáveis (commits reais)

| Commit | Entrega | Tipo |
|---|---|---|
| [`09a355c`](https://github.com/Joaogabrielmaia/Automated-CRM-follow-up-on-WhatsApp/commit/09a355c) | Estrutura inicial do repositório | chore |
| [`8250ab4`](https://github.com/Joaogabrielmaia/Automated-CRM-follow-up-on-WhatsApp/commit/8250ab4) | Brainstorm, cenário, registros simulados e problemas priorizados | docs(discovery) |
| [`4977200`](https://github.com/Joaogabrielmaia/Automated-CRM-follow-up-on-WhatsApp/commit/4977200) | Definição, arquitetura e protótipo | docs |

## Critérios de conclusão

Problemas priorizados com evidência; requisitos e regras com valor padrão; decisões com alternativas e trade-off; pedidos do protótipo decididos com motivo.

## Cerimônias

**Planning.** Objetivo: transformar a dor do dono e da atendente em requisitos verificáveis. Backlog inicial: escolha da ideia, três registros de discovery, definição e ADRs.

**Refinamento.** Contradição dono × atendente tratada por papéis; "tudo automático" refinado em limites explícitos (horário, no máximo 2 follow-ups, parada na resposta, opt-out); "sistema fácil" virou RNF-05.

**Review.** Incremento: documentação de discovery, definição e arquitetura. Evidências: [Episódio 1](../../01-discovery/README.md), [Episódio 2](../../02-definicao/README.md), [Episódio 3](../../03-arquitetura/README.md) e [Episódio 4](../../04-prototipo/README.md). Reunião de validação: [registro](../../04-prototipo/02-validacao-do-prototipo.md).

**Retrospectiva.** Funcionou: separar pergunta, resposta e conclusão em cada registro. A restrição do número dedicado só apareceu na última pergunta e mudou o escopo (provedor plugável). Ação: tratar toda integração externa como risco desde o discovery (RSK-08).

## Riscos e impedimentos

RSK-01 a RSK-10 identificados; RSK-10 (MVP grande demais) tratado com corte em ordem definida.
