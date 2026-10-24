# Sprint 4 · Preparação do go-live

[← Índice do ciclo de vida](../README.md) · [← Sprint 3](sprint-3.md) · [Evolução e roadmap →](../09-evolucao-e-roadmap.md)

**Semanas do cenário:** 8 · **Objetivo:** Fechar as lacunas que apareceram ao descrever o go-live passo a passo.

## Escopo

RF-19, RF-20, RN-19 e RSK-08: usuário real, importação CSV, desativar regra cancela a fila, log "Atrasado", health do agendador, modelo aprovado e webhook nativo da Meta, CI, E2E contra o build, fluxo do n8n versionado, documentação de go-live.

## Entregáveis (commits reais)

| Commit | Entrega | Tipo |
|---|---|---|
| [`351c855`](https://github.com/Joaogabrielmaia/Automated-CRM-follow-up-on-WhatsApp/commit/351c855) | `user:create` para contas reais | feat(scripts) |
| [`d037208`](https://github.com/Joaogabrielmaia/Automated-CRM-follow-up-on-WhatsApp/commit/d037208) | Documentação de n8n, boas práticas, rollback, rollout e treinamento | docs |
| [`923a5fc`](https://github.com/Joaogabrielmaia/Automated-CRM-follow-up-on-WhatsApp/commit/923a5fc) | Runbook e retrospectiva | docs(pos-go-live) |
| [`d654fab`](https://github.com/Joaogabrielmaia/Automated-CRM-follow-up-on-WhatsApp/commit/d654fab) | Desativar regra cancela a fila (RN-19), log de atraso, health do agendador e modelos da Meta | feat(automation) |
| [`27c70c2`](https://github.com/Joaogabrielmaia/Automated-CRM-follow-up-on-WhatsApp/commit/27c70c2) | Entrada nativa da WhatsApp Cloud API | feat(webhook) |
| [`a2d5319`](https://github.com/Joaogabrielmaia/Automated-CRM-follow-up-on-WhatsApp/commit/a2d5319) | Importação CSV (RF-20) e seed de piloto | feat(leads) |
| [`1cb4fd7`](https://github.com/Joaogabrielmaia/Automated-CRM-follow-up-on-WhatsApp/commit/1cb4fd7) | Remove `loading.tsx`; CI, E2E contra o build e n8n versionado | fix(ui) |
| [`36beb66`](https://github.com/Joaogabrielmaia/Automated-CRM-follow-up-on-WhatsApp/commit/36beb66) | Documentação de go-live, qualidade e retrospectiva atualizada | docs |
| [`448ad1d`](https://github.com/Joaogabrielmaia/Automated-CRM-follow-up-on-WhatsApp/commit/448ad1d) | Dependências de desenvolvimento do Neon | chore(neon) |

## Critérios de conclusão

Lacunas fechadas no código ou declaradas abertas; CI executando tipos, lint, testes e E2E; documentos com status declarado.

## Cerimônias

**Planning.** Objetivo: nenhuma lacuna conhecida do go-live sem dono. Itens vieram da lista de lacunas da [retrospectiva](../../07-pos-go-live/retrospectiva.md).

**Refinamento.** Decisão do rollout: começar sem envio, só lembretes para a atendente, porque o adaptador da Meta nunca falou com a API real.

**Review.** Incremento: RN-19, RF-20, usuário real, webhook nativo, CI e E2E de produção. Evidências: [rollout](../../06-go-live/rollout.md), [ADR-010](../../03-arquitetura/adr/ADR-010-sem-loading-tsx.md) e runs da CI na `main` ([39980673278](https://github.com/Joaogabrielmaia/Automated-CRM-follow-up-on-WhatsApp/actions/runs/39980673278)).

**Retrospectiva.** Defeitos: desativar regra não cancelava a fila (`d654fab`, RN-19); não havia criação de usuário real (`351c855`); o log "Atrasado" estava prometido e ausente (`d654fab`); `loading.tsx` deixava ações sem atualizar a tela só no build de produção (`1cb4fd7`). Ação: E2E contra o build de produção desde a primeira sprint.

## Riscos e impedimentos

RSK-04 mitigado em código (health, evento Atrasado), falta o monitor externo; RSK-08 segue aberto.
