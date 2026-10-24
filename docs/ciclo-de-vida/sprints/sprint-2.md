# Sprint 2 · Automação

[← Índice do ciclo de vida](../README.md) · [← Sprint 1](sprint-1.md) · [Sprint 3 →](sprint-3.md)

**Semanas do cenário:** 4 e 5 · **Objetivo:** Entregar o motor que envia sem incomodar: as quatro garantias implementadas como regras puras e orquestração com banco.

## Escopo

HU-06 a HU-13 e HU-16: modelos, regras, provedor (interface, simulado e API oficial), motor de regras, fila com horário comercial, idempotência, retentativa, webhook, opt-out, parada por resposta, orçamento sem retorno, pausa por lead.

## Entregáveis (commits reais)

| Commit | Entrega | Tipo |
|---|---|---|
| [`8287eff`](https://github.com/Joaogabrielmaia/Automated-CRM-follow-up-on-WhatsApp/commit/8287eff) | Regras puras com testes unitários (RN-01 a RN-18) | feat(rules) |
| [`91b341f`](https://github.com/Joaogabrielmaia/Automated-CRM-follow-up-on-WhatsApp/commit/91b341f) | Motor, entrada de respostas, providers e serviços | feat(automation) |
| [`b6873ed`](https://github.com/Joaogabrielmaia/Automated-CRM-follow-up-on-WhatsApp/commit/b6873ed) | RN-18: intervalo mínimo entre mensagens | docs |

## Critérios de conclusão

Regras recebem a hora como parâmetro; chave única e reserva atômica; toda decisão do motor deixa registro com motivo (RNF-07); provedor atrás de interface.

## Cerimônias

**Planning.** Objetivo: provar que o motor respeita horário, duplicidade, resposta e opt-out. Backlog ordenado pelas garantias, não pelas telas.

**Refinamento.** Decisão do ADR-003: duas camadas no banco. Refinamento do caso difícil: job travado em SENDING vira FAILED com tarefa, sem reenvio.

**Review.** Incremento: `src/lib/rules` (9 arquivos), `src/lib/automation` (`engine.ts`, `inbound.ts`) e `src/lib/providers`. [Arquitetura e ADRs](../04-arquitetura-e-adrs.md), [Modelo de dados](../05-modelo-de-dados.md).

**Retrospectiva.** Funcionou: regras puras com o relógio como parâmetro. O risco de rajada de mensagens quando o ciclo fica parado levou à RN-18 (intervalo mínimo de 12 h), acrescentada ao fim da sprint. Ação: testar a rajada no motor.

## Riscos e impedimentos

RSK-02 e RSK-03 mitigados no código; RSK-08 aberto (adaptador da Meta escrito conforme documentação pública, sem teste real).
