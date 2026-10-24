# Sprint 3 · Qualidade e visibilidade

[← Índice do ciclo de vida](../README.md) · [← Sprint 2](sprint-2.md) · [Sprint 4 →](sprint-4.md)

**Semanas do cenário:** 6 e 7 · **Objetivo:** Provar as garantias com testes de integração e ponta a ponta e dar visibilidade ao dono e à atendente.

## Escopo

HU-14 e HU-15: painel, log da automação, simulador; suítes de integração (motor, webhook, autorização, leads, painel, health) e E2E; seed de demonstração; documentação de qualidade.

## Entregáveis (commits reais)

| Commit | Entrega | Tipo |
|---|---|---|
| [`3d8cf31`](https://github.com/Joaogabrielmaia/Automated-CRM-follow-up-on-WhatsApp/commit/3d8cf31) | Seed de demonstração e scripts tick e simulate-reply | feat(seed) |
| [`b0f0c57`](https://github.com/Joaogabrielmaia/Automated-CRM-follow-up-on-WhatsApp/commit/b0f0c57) | Integração: motor, respostas e falhas do provedor | test(integration) |
| [`3450f06`](https://github.com/Joaogabrielmaia/Automated-CRM-follow-up-on-WhatsApp/commit/3450f06) | Integração: webhook, autorização, leads, painel e healthcheck | test(integration) |
| [`280f792`](https://github.com/Joaogabrielmaia/Automated-CRM-follow-up-on-WhatsApp/commit/280f792) | Seed alinhado à tela de login e aos docs | fix(seed) |
| [`286f650`](https://github.com/Joaogabrielmaia/Automated-CRM-follow-up-on-WhatsApp/commit/286f650) | E2E: login, funil, regras e simulador em banco isolado | test(e2e) |
| [`4ceef82`](https://github.com/Joaogabrielmaia/Automated-CRM-follow-up-on-WhatsApp/commit/4ceef82) | Como rodar os testes, o que cobrem e o que falta | docs(qualidade) |

## Critérios de conclusão

Teste para cada regra de negócio; bancos separados por tipo de teste; lacunas de teste documentadas.

## Cerimônias

**Planning.** Objetivo: transformar cada garantia em teste que falha se ela for quebrada. Itens: integração do motor e do webhook, E2E dos fluxos da atendente e do dono.

**Refinamento.** Teste de concorrência (dois ciclos simultâneos) e de parada na resposta definidos a partir do ADR-003 e da RN-04.

**Review.** Incremento: suítes de integração e E2E. Evidência atual: 200 testes de unidade e integração e 16 E2E, [logs de 24/10/2026](../../05-qualidade/README.md). [Testes e qualidade](../07-testes-e-qualidade.md).

**Retrospectiva.** Defeitos: o seed discordava da tela de login e dos docs (`280f792`); a matriz de rastreabilidade citava testes inexistentes (corrigida em `36beb66`). Ação: escrever a matriz a partir do que existe e rodar o E2E contra o build de produção.

## Riscos e impedimentos

Lacunas conhecidas: acessibilidade, carga e RNF-05 sem teste automático.
