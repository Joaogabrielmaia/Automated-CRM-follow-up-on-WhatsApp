# Pulso

**Mini CRM com funil de vendas e follow-up automático no WhatsApp: regras configuráveis, horário comercial, sem duplicar mensagem, parada na resposta e opt-out.**

## Em 30 segundos

- **Problema:** numa empresa fictícia de reformas, o lead esfria depois do orçamento porque ninguém lembra de voltar a falar com ele.
- **Solução:** o Pulso agenda o retorno e o executa por regras, com quatro travas para não incomodar o cliente.
- **Prova:** 200 testes de unidade e integração e 16 de ponta a ponta passaram em 24/10/2026 ([log](docs/05-qualidade/execucao-test-cbbcc47.txt)). Um defeito que só aparecia em produção foi medido: com `loading.tsx`, 3/40 e 5/40 falhas; sem ele, 0/60 e 0/40 (tabela do autor, [ADR-010](docs/03-arquitetura/adr/ADR-010-sem-loading-tsx.md)).
- **Comece por aqui:** [tela do lead](docs/imagens/04-lead.png) · [ADR-003: idempotência](docs/03-arquitetura/adr/ADR-003-idempotencia.md) · [o que foi e o que não foi testado](docs/05-qualidade/README.md)

## Ficha técnica

| Campo | Informação |
|---|---|
| Natureza | Caso fictício: empresa (Casa Nova Reformas), pessoas e dados inventados |
| Discovery | Reuniões simuladas, marcadas nas atas ([Ep. 1](docs/01-discovery/README.md)) |
| Stack | Next.js 15, React 19, TypeScript, Prisma, PostgreSQL, Zod, Vitest, Playwright, n8n |
| Mensagens | Provedor simulado; adaptador da WhatsApp Cloud API não validado contra a Meta |
| Agendador | n8n dispara o ciclo a cada 5 minutos |
| Testes | 200 de unidade e integração (111 + 89) e 16 E2E; log de 24/10/2026, commit `cbbcc47` |
| Execução | Local; não hospedado |

## Duas entradas

**Pelo lado do negócio.** [Ep. 1 Discovery](docs/01-discovery/README.md): o problema e as reuniões simuladas. [Ep. 2 Definição](docs/02-definicao/README.md): requisitos, regras e metas. [Ep. 6 Go-live](docs/06-go-live/README.md): como entraria em uso. [Ep. 7 Pós-go-live](docs/07-pos-go-live/README.md): operação e retrospectiva.

**Pelo lado técnico.** [Ep. 3 Arquitetura](docs/03-arquitetura/README.md): modelo de dados, fluxo, modos de falha e ADRs. [Ep. 5 Qualidade](docs/05-qualidade/README.md): testes, logs de execução e limites.

Guia completo da série: [docs/INDEX.md](docs/INDEX.md). Termos técnicos: [glossário](docs/GLOSSARIO.md).

<table>
<tr>
<td width="50%"><img src="docs/imagens/04-lead.png" alt="Detalhe de um lead com linha do tempo, próximo passo da automação (follow-up 1 em 24h, follow-up 2 em 72h, Perdido em 120h) e botão Pausar automação"></td>
<td width="50%"><img src="docs/imagens/03-funil.png" alt="Quadro do funil com as seis colunas: Novo, Contatado, Orçamento enviado, Negociação, Ganho e Perdido"></td>
</tr>
<tr>
<td width="50%"><img src="docs/imagens/06-regras.png" alt="Lista de seis regras de automação ativas, com gatilho, espera, ação e texto do modelo"></td>
<td width="50%"><img src="docs/imagens/02-hoje.png" alt="Tela O que fazer hoje, com duas tarefas e um lead sem resposta"></td>
</tr>
</table>

![Gravação do app: o ciclo envia o follow-up 1 à lead Carla Mendes, ela responde pelo simulador e o log registra "Lead respondeu" com a sequência interrompida](docs/imagens/demo-followup.gif)

Fluxo real de 23 segundos: contato registrado, follow-up enviado (ciclo com data simulada, pois ele só vence em 24 h), resposta pelo simulador e parada da sequência. [Detalhes e demais telas](docs/imagens/README.md).

## As 4 garantias

| Garantia | Regra |
|---|---|
| Só envia em **horário comercial**; fora dele, a mensagem espera na fila | [RN-01 e RN-02](docs/02-definicao/03-regras-de-negocio.md) |
| **Nunca duas vezes** a mesma mensagem, nem com dois ciclos ao mesmo tempo | [RN-05](docs/02-definicao/03-regras-de-negocio.md) · [ADR-003](docs/03-arquitetura/adr/ADR-003-idempotencia.md) |
| **Para quando o lead responde** e cria uma tarefa para a atendente | [RN-04](docs/02-definicao/03-regras-de-negocio.md) |
| **Respeita o opt-out**: SAIR, PARAR ou STOP bloqueiam novos envios | [RN-03](docs/02-definicao/03-regras-de-negocio.md) |

## O problema

Em uma empresa pequena de serviços, o orçamento sai e o retorno depende de alguém lembrar. O lead esfria.
Automatizar o retorno é simples; o difícil é fazer isso sem virar insistência, mensagem de madrugada ou resposta duplicada. Detalhes: [Ep. 1](docs/01-discovery/README.md).

## O que faz

- Funil de leads com etapas configuráveis, linha do tempo e tarefas por lead.
- Regras com gatilho, espera e ação: enviar mensagem, criar tarefa ou mover para Perdido.
- Modelos de mensagem com variáveis; se faltar um dado, a mensagem é pulada (RN-14).
- Log de cada decisão do motor e simulador de resposta do lead.
- Painel de indicadores e importação de leads por CSV.

## O que este projeto mostra

- Regras de negócio escritas como funções puras que recebem a hora, testáveis sem esperar o relógio.
- Idempotência em duas camadas no banco, com teste de concorrência.
- Um defeito que só existia no build de produção, diagnosticado por medição e não por palpite.

## O que o projeto exercita, e onde está a prova

| O que o projeto exercita | Onde está a prova |
|---|---|
| Traduzir "tudo automático" em regras verificáveis | [19 regras com valor padrão](docs/02-definicao/03-regras-de-negocio.md) e [rastreabilidade](docs/02-definicao/07-rastreabilidade.md) |
| Desenhar follow-up que respeita horário, resposta e opt-out | [Tela de regras](docs/imagens/06-regras.png) e as regras RN-01 a RN-04 |
| Garantir que a mesma mensagem não saia duas vezes | [ADR-003](docs/03-arquitetura/adr/ADR-003-idempotencia.md) |
| Diagnosticar um defeito só de produção com medição | [ADR-010](docs/03-arquitetura/adr/ADR-010-sem-loading-tsx.md) |
| Recusar escopo com motivo | [Validação do protótipo](docs/04-prototipo/02-validacao-do-prototipo.md): reunião simulada, 2 recusados, 3 adiados, 5 aceitos |
| Escrever mensagem de follow-up com critério | [Boas práticas de mensagem](docs/06-go-live/boas-praticas-de-mensagem.md) e [modelos](docs/imagens/07-modelos.png) |
| Planejar operação e volta atrás | [Go-live](docs/06-go-live/README.md) e [runbook](docs/07-pos-go-live/runbook.md), com o status declarado em cada um |

## Episódios

| Ep. | Tema | Leia |
|---|---|---|
| 0 | Sobre este caso | [Real × simulado](docs/00-sobre-este-caso/README.md) |
| 1 | Discovery | [Problema, personas e reuniões simuladas](docs/01-discovery/README.md) |
| 2 | Definição | [Requisitos, regras e metas](docs/02-definicao/README.md) |
| 3 | Arquitetura | [Fluxo, modos de falha e ADRs](docs/03-arquitetura/README.md) |
| 4 | Protótipo | [Wireframes e validação simulada](docs/04-prototipo/README.md) |
| 5 | Qualidade | [Testes, logs e limites](docs/05-qualidade/README.md) |
| 6 | Go-live | [Rollout, n8n, rollback e treinamento](docs/06-go-live/README.md) |
| 7 | Pós-go-live | [Runbook e retrospectiva](docs/07-pos-go-live/README.md) |

## Decisões que contam

| ADR | Decisão |
|---|---|
| [003](docs/03-arquitetura/adr/ADR-003-idempotencia.md) | Idempotência por chave única no banco e reserva atômica antes do envio |
| [005](docs/03-arquitetura/adr/ADR-005-retentativa-e-falhas.md) | Retentativa com backoff de 1, 5 e 15 minutos; erro definitivo não tenta de novo |
| [010](docs/03-arquitetura/adr/ADR-010-sem-loading-tsx.md) | Sem `loading.tsx`: ações deixavam de atualizar a tela só no build de produção |

**A decisão difícil: não enviar duas vezes.** Texto de [ADR-003](docs/03-arquitetura/adr/ADR-003-idempotencia.md) e do [registro do dono](docs/01-discovery/03-registro-dono.md).

| | |
|---|---|
| Contexto | O ciclo pode rodar duas vezes seguidas (n8n repetindo a chamada, duas instâncias, execução manual). O dono citou "mandar duas vezes a mesma coisa" como a pior hipótese |
| Alternativas | Consultar "já enviei?" antes de enviar (não resolve execuções simultâneas); lock global do ciclo (serializa tudo e não protege contra repetição em outro momento); chave única por intenção de envio mais reserva atômica |
| Escolha | Duas camadas, ambas no banco: `INSERT ... ON CONFLICT DO NOTHING` sobre a chave regra + lead + ciclo, e `UPDATE ... WHERE status = 'PENDING'` antes de enviar |
| Custo aceito | Se o processo cair entre a reserva e a resposta do provedor, o job vira falha por "estado incerto", sem reenvio, e gera tarefa para a atendente. A mensagem pode não sair; não sai duplicada |
| Quando mudaria | Se o provedor aceitasse chave de idempotência própria, a chave seria repassada e os jobs em estado incerto poderiam ser reenviados com segurança |
| Contexto de escopo | A API oficial exige número dedicado e o dono não quer trocar o dele. Isso levou ao provedor plugável e à ação "criar tarefa" ([registro do dono](docs/01-discovery/03-registro-dono.md)) |

## Evidências

Execução de 24/10/2026 no commit `cbbcc47`, com data, versão do Node e comando no cabeçalho de cada log: [teste](docs/05-qualidade/execucao-test-cbbcc47.txt) · [E2E](docs/05-qualidade/execucao-test-e2e-cbbcc47.txt) · [tipos](docs/05-qualidade/execucao-typecheck-cbbcc47.txt) · [lint](docs/05-qualidade/execucao-lint-cbbcc47.txt).

| Grupo | Testes por arquivo |
|---|---|
| Unitários (111) | csv 16, opt-out 15, due-rules 14, phone 14, whatsapp-cloud 12, guards 12, template 10, business-hours 10, backoff 4, signature 4 |
| Integração (89) | engine 21, leads 15, webhook-meta 14, authorization 9, webhook 8, import 7, seed-pilot 7, health 5, dashboard 3 |
| E2E (16) | funil 5, login-e-papeis 5, regras 2, importação 2, simulador 2 |

A CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) roda tipos, lint, testes e E2E a cada push na `main`. O último run antes desta branch, no commit `cbbcc47`, terminou com sucesso ([run](https://github.com/Joaogabrielmaia/Automated-CRM-follow-up-on-WhatsApp/actions/runs/39980673278)).

## Rodar localmente

Precisa de Node 20.9+ e Docker.

```bash
cp .env.example .env        # preencha AUTH_SECRET, AUTOMATION_SECRET e WEBHOOK_SECRET
npm install
npm run db:up               # Postgres na porta 5434
npm run db:migrate
npm run db:seed             # contas de teste e leads fictícios
npm run dev                 # http://localhost:3000
```

Contas de teste (senha `Demo@2026`): `marcos@casanova.example` (Admin) e `camila@casanova.example` (Atendente).

| Comando | O que faz |
|---|---|
| `npm test` | Unitários e integração (precisa do banco no ar) |
| `npm run test:e2e` | Testes no navegador, contra o build de produção |
| `npm run typecheck` / `npm run lint` | Tipos e estilo |
| `npm run tick` | Roda um ciclo da automação na linha de comando |
| `npm run simulate:reply -- <telefone> "<texto>"` | Simula uma resposta de lead |

O n8n é opcional e sobe com `docker compose --profile n8n up -d n8n`: [passo a passo](docs/06-go-live/n8n.md).

## O que falta para sair do estudo

- Integração com a Meta não validada: [limites](docs/05-qualidade/README.md).
- Agendamento do n8n por horas não testado: [n8n](docs/06-go-live/n8n.md).
- Rollback, runbook e treinamento não ensaiados: [rollback](docs/06-go-live/rollback.md) · [runbook](docs/07-pos-go-live/runbook.md) · [treinamento](docs/06-go-live/treinamento.md).
- Sem hospedagem: [qualidade](docs/05-qualidade/README.md).
- Acessibilidade e carga não testadas; RNF-05 sem teste automático: [qualidade](docs/05-qualidade/README.md).

## Limites

Não há usuário real, piloto nem medição de resultado: as metas M1 a M6 são hipóteses ([metas](docs/02-definicao/01-visao-e-metas.md)). O envio é simulado e o fuso é fixo em UTC−3 ([ADR-004](docs/03-arquitetura/adr/ADR-004-agendamento-e-fila.md)).

## Licença

MIT.
