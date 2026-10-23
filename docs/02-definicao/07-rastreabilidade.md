# Matriz de rastreabilidade

**Objetivo:** ligar cada requisito a uma história, a um teste e a uma tela.
**Data:** 23/10/2026 · **Status:** conferido contra os arquivos de teste que existem de fato (rodei a lista inteira)
**Relacionados:** [requisitos](02-requisitos.md) · [histórias](04-historias-de-usuario.md) · [qualidade](../05-qualidade/README.md)

Telas: T01 Login · T02 Hoje · T03 Funil · T04 Lead · T05 Novo lead · T06 Modelos · T07 Regras · T08 Log da automação · T09 Painel · T10 Simulador · T11 Configurações.

| Requisito | História | Teste | Tela |
|---|---|---|---|
| RF-01 | HU-01 | `tests/integration/authorization.test.ts`, `e2e/login-e-papeis.spec.ts` | T01 |
| RF-02, RN-13 | HU-02 | `tests/unit/phone.test.ts`, `tests/integration/leads.test.ts`, `e2e/funil.spec.ts` | T05, T04 |
| RF-03 | HU-04 | `tests/integration/leads.test.ts` | T11 |
| RF-04, RF-18, RN-09 | HU-03 | `tests/integration/leads.test.ts`, `e2e/funil.spec.ts` | T03 |
| RF-05 | HU-05 | `tests/integration/leads.test.ts` | T04 |
| RF-06 | HU-05 | `e2e/funil.spec.ts` | T02, T04 |
| RF-07, RN-14 | HU-06 | `tests/unit/template.test.ts`, `tests/unit/whatsapp-cloud.test.ts`, `tests/integration/engine.test.ts`, `tests/integration/leads.test.ts` | T06 |
| RF-08, RN-16, RN-19 | HU-07 | `tests/unit/guards.test.ts`, `tests/integration/authorization.test.ts`, `tests/integration/engine.test.ts`, `e2e/regras.spec.ts` | T07 |
| RF-09, RN-12 | HU-08 | `tests/integration/engine.test.ts` | T07, T08 |
| RN-01, RN-02 | HU-08 | `tests/unit/business-hours.test.ts`, `tests/integration/engine.test.ts` | T08 |
| RF-10, RN-07, RN-08 | HU-09 | `tests/unit/due-rules.test.ts`, `tests/integration/engine.test.ts` | T08 |
| RN-05, RNF-01 | HU-09 | `tests/integration/engine.test.ts` | T08 |
| RN-06 | HU-09 | `tests/integration/engine.test.ts` | T08 |
| RF-11, RN-15 | HU-12 | `tests/integration/engine.test.ts` | T02, T08 |
| RF-12, RN-10 | HU-13 | `tests/integration/engine.test.ts` | T04 |
| RF-13, RN-04, RNF-09 | HU-10 | `tests/unit/signature.test.ts`, `tests/integration/webhook.test.ts`, `tests/integration/webhook-meta.test.ts`, `e2e/simulador.spec.ts` | T10 |
| RF-14, RN-03 | HU-11 | `tests/unit/opt-out.test.ts`, `tests/integration/webhook.test.ts` | T04 |
| RF-15 | HU-14 | `tests/integration/dashboard.test.ts` | T09 |
| RF-16, RNF-07 | HU-14 | `tests/integration/engine.test.ts` | T08 |
| RF-17 | HU-15 | `e2e/simulador.spec.ts` | T10 |
| RNF-02, RN-11 | HU-16 | `tests/unit/backoff.test.ts`, `tests/integration/engine.test.ts` | T08 |
| RNF-03 | HU-01 | `tests/integration/authorization.test.ts` | todas |
| RF-19 | — | `tests/integration/health.test.ts` | — |
| RF-20 | HU-02 | `tests/unit/csv.test.ts`, `tests/integration/import.test.ts`, `e2e/importacao.spec.ts` | T04 |
| (implantação) | — | `tests/integration/seed-pilot.test.ts` | — |
