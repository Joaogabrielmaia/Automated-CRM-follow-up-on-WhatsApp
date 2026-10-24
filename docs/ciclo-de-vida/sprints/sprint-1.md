# Sprint 1 · Fundação

[← Índice do ciclo de vida](../README.md) · [← Sprint 0](sprint-0.md) · [Sprint 2 →](sprint-2.md)

**Semanas do cenário:** 2 e 3 · **Objetivo:** Ter leads e funil funcionando, com autorização no servidor desde o primeiro dia.

## Escopo

HU-01 a HU-05: login com papéis (RF-01), cadastro e edição de lead com telefone único (RF-02, RN-13), etapas configuráveis (RF-03), quadro do funil (RF-04), histórico e tarefas (RF-05, RF-06).

## Entregáveis (commits reais)

| Commit | Entrega | Tipo |
|---|---|---|
| [`9a98212`](https://github.com/Joaogabrielmaia/Automated-CRM-follow-up-on-WhatsApp/commit/9a98212) | Schema Prisma e migrations | feat(db) |
| [`bb9c2f4`](https://github.com/Joaogabrielmaia/Automated-CRM-follow-up-on-WhatsApp/commit/bb9c2f4) | Sessão, papéis, server actions e rotas de automação e webhook | feat(auth) |
| [`38c0309`](https://github.com/Joaogabrielmaia/Automated-CRM-follow-up-on-WhatsApp/commit/38c0309) | Telas de funil, leads, regras, modelos, painel e simulador | feat(ui) |

## Critérios de conclusão

Cada serviço confere sessão e papel; entrada validada com Zod; telefone normalizado e único; etapas com tipo (aberta, orçamento, ganha, perdida).

## Cerimônias

**Planning.** Objetivo: base de dados e autorização antes de qualquer automação. Itens: schema, sessão, papéis, CRUD de leads e quadro.

**Refinamento.** Decisão de manter regra de negócio fora de rotas e componentes: actions só validam e chamam serviços ([componentes](../../03-arquitetura/03-componentes.md)).

**Review.** Incremento: schema com 3 migrations ao final do projeto, telas de funil e lead. Evidência de autorização por papel: `tests/integration/authorization.test.ts` (Sprint 3). [Modelo de dados](../05-modelo-de-dados.md).

**Retrospectiva.** Funcionou: ADR-008 (autenticação por e-mail e senha com dois papéis) deu um limite claro. Atenção: o commit `38c0309` reúne as telas de funil, leads, regras, modelos, painel e simulador de uma vez. Ação: um commit por entrega lógica, como a convenção do projeto pede.

## Riscos e impedimentos

RSK-09 (dados pessoais) tratado por autorização no servidor e anonimização.
