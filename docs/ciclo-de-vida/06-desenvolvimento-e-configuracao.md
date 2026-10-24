# 06 · Desenvolvimento e gestão de configuração

[← Índice do ciclo de vida](README.md) · [← 05 Modelo de dados](05-modelo-de-dados.md) · Próximo: [07 Testes e qualidade →](07-testes-e-qualidade.md)

Tudo o que está aqui foi conferido no repositório e na API do GitHub em 24/10/2026. Infraestrutura planejada aparece só onde o texto diz "planejado".

## Estratégia de branches e pull requests

| Elemento | Prática observada |
|---|---|
| Branch principal | `main` |
| Branches de trabalho | `docs/apresentacao` (PR #1), `docs/readme-venda` (PR #2) e `docs/ciclo-de-vida` (este trabalho); o código inicial foi commitado direto na `main` |
| Pull requests | #1 e #2 mesclados em 24/10/2026, cada um com a CI verde antes do merge |
| Critério de merge | CI verde (tipos, lint, testes, E2E), links dos `.md` sem quebra e nenhuma alteração em código ou teste nos PRs de documentação |
| Revisão de código | Não há revisor humano registrado; a revisão é automática (CI) e documental |

## Convenção de commits e versionamento

- **Commits:** Conventional Commits, um por entrega lógica, citando os IDs (RF, RN) quando há (`feat(automation): desativar regra cancela a fila (RN-19) ...`).
- **Versão:** `package.json` declara `1.0.0`. **Não há tags, releases nem CHANGELOG**, então não há versionamento semântico aplicado ao histórico. O plano de releases está em [Planejamento](02-planejamento-e-scrum.md#release-plan).

## Organização modular

| Pasta | Responsabilidade |
|---|---|
| `src/lib/rules` | Funções puras que recebem a hora: horário, vencimento, travas, backoff, opt-out, telefone, modelo, assinatura, CSV |
| `src/lib/automation` | Motor do ciclo (`engine.ts`) e tratamento de respostas (`inbound.ts`) |
| `src/lib/services` | Acesso a dados por assunto, com checagem de papel |
| `src/lib/providers` | `MessageProvider`, adaptador simulado e da Cloud API |
| `src/app` | Telas, Server Actions e rotas de API |
| `prisma` | Schema, migrations e seeds |
| `tests` e `e2e` | Unidade, integração e navegador |
| `automations` | Fluxo do n8n versionado |

Padrões: regra de negócio fora de componentes e rotas; toda rota e action valida a entrada com Zod e confere sessão e papel no servidor; envio de WhatsApp só por `MessageProvider`.

## CI/CD e automações existentes

O workflow é `.github/workflows/ci.yml` e dispara em push na `main` e em pull request. Um job (`qualidade`, Ubuntu, Node 22, Postgres 16 como serviço) executa, nesta ordem: instalação das dependências a partir do `package-lock.json`, geração do cliente Prisma, tipos, lint, testes de unidade e integração, instalação do Chromium e E2E contra o build de produção; se falhar, envia o relatório do Playwright como artefato. **Não há CD**: nenhum workflow publica a aplicação.

| Run | Data (UTC) | Commit | Evento | Resultado |
|---|---|---|---|---|
| [39973445233](https://github.com/Joaogabrielmaia/Automated-CRM-follow-up-on-WhatsApp/actions/runs/39973445233) | 23/10/2026 14:53 | `36beb66` | push na `main` | sucesso |
| [39974242961](https://github.com/Joaogabrielmaia/Automated-CRM-follow-up-on-WhatsApp/actions/runs/39974242961) | 23/10/2026 14:58 | `448ad1d` | push na `main` | sucesso |
| [39980673278](https://github.com/Joaogabrielmaia/Automated-CRM-follow-up-on-WhatsApp/actions/runs/39980673278) | 23/10/2026 15:43 | `cbbcc47` | push na `main` | sucesso |
| [40097777544](https://github.com/Joaogabrielmaia/Automated-CRM-follow-up-on-WhatsApp/actions/runs/40097777544) | 24/10/2026 13:21 | `f809e1c` | PR #1 | sucesso |
| [40097919766](https://github.com/Joaogabrielmaia/Automated-CRM-follow-up-on-WhatsApp/actions/runs/40097919766) | 24/10/2026 13:23 | `e9b0079` | push na `main` | sucesso |
| [40100756274](https://github.com/Joaogabrielmaia/Automated-CRM-follow-up-on-WhatsApp/actions/runs/40100756274) | 24/10/2026 14:02 | `2cbca15` | PR #2 | sucesso |
| [40100951747](https://github.com/Joaogabrielmaia/Automated-CRM-follow-up-on-WhatsApp/actions/runs/40100951747) | 24/10/2026 14:05 | `b2686ea` | push na `main` | sucesso |

## Gestão de ambientes e configuração

| Ambiente | O que existe |
|---|---|
| Desenvolvimento local | `docker-compose.yml` com Postgres 16 (serviço `db`, porta 5434) e n8n opcional (perfil `n8n`); bancos `pulso`, `pulso_test` e `pulso_e2e`, separados por tipo de teste |
| CI | Postgres 16 como serviço do job, com variáveis de teste definidas no próprio workflow |
| Produção | **Planejado**, sem hospedagem definida; as instruções de execução ficam no [CONTRIBUTING.md](../../CONTRIBUTING.md) |

Variáveis documentadas em `.env.example`: `DATABASE_URL`, `AUTH_SECRET`, `AUTOMATION_SECRET`, `WEBHOOK_SECRET`, `MESSAGE_PROVIDER`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `NEXT_PUBLIC_DEMO_ACCOUNTS` e `PULSO_APP_URL`.

## Dependências e segredos

Dependências travadas em `package-lock.json`; `engines` exige Node 20.9 ou superior. O `.gitignore` exclui `.env`, `.neon`, `.neon.env` e `.deploy-secrets.env`. Nenhum segredo está versionado: a varredura do histórico (chaves de API, chaves privadas, URLs de banco) só encontrou a credencial do banco local de desenvolvimento, que também é a do `docker-compose.yml`. Os segredos do workflow são valores de teste definidos no próprio arquivo, sem valor fora da CI.

## Linha do tempo real dos commits

Horário local (UTC−3). Os commits de desenvolvimento ocorreram em dois dias; as semanas das sprints do cenário não correspondem a este calendário.

| Data e hora | Commit | Tema |
|---|---|---|
| 22/10 16:19 a 16:28 | `09a355c`, `8250ab4`, `4977200` | Estrutura, discovery, definição, arquitetura e protótipo |
| 22/10 17:30 a 17:33 | `b6873ed`, `9a98212`, `8287eff`, `91b341f`, `bb9c2f4`, `38c0309`, `3d8cf31` | Schema, regras puras, motor, autenticação, telas e seed |
| 22/10 17:35 a 17:51 | `b0f0c57`, `3450f06`, `280f792`, `286f650`, `4ceef82` | Testes de integração, E2E, correção do seed e qualidade |
| 23/10 10:41 | `351c855`, `d037208`, `923a5fc` | Usuário real, documentos de go-live e runbook |
| 23/10 11:36 a 11:44 | `d654fab`, `27c70c2`, `a2d5319`, `1cb4fd7`, `36beb66` | RN-19, webhook nativo, importação CSV, correção do `loading.tsx`, CI e documentação |
| 23/10 11:58 e 12:43 | `448ad1d`, `cbbcc47` | Dependências do Neon e README com prints |
| 24/10 00:50 a 10:23 | `5864c52` a `e9b0079` | Apresentação em episódios, galeria, GIF e PR #1 |
| 24/10 11:02 a 11:05 | `40a35d9`, `2cbca15`, `b2686ea` | README como venda de competência e PR #2 |

## Dívida técnica e estratégia de refatoração

| Item | Origem | Estratégia |
|---|---|---|
| Adaptador da Meta não validado | [Qualidade](../05-qualidade/README.md) | Testar na sandbox antes de qualquer envio real |
| Ausência de tags, releases e CHANGELOG | Este documento | Criar a primeira tag e um CHANGELOG quando houver versão estável |
| Commits grandes (`38c0309`, `91b341f`) | Histórico | Manter um commit por entrega lógica daqui em diante |
| Sem recuperação de senha nem limite de tentativas | [ADR-008](../03-arquitetura/adr/ADR-008-autenticacao.md) | Backlog de baixa prioridade |
| Sem política de retenção por prazo | [Modelo de dados](05-modelo-de-dados.md) | Definir antes de uso com dados reais |

## Evolução entre versões

Não há versões publicadas; o único marco de compatibilidade é o schema, com 3 migrations aplicadas em ordem. O impacto de cada mudança relevante está em [Evolução e roadmap](09-evolucao-e-roadmap.md).
