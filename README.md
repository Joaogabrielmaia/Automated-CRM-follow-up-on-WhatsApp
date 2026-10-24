# Pulso

**Mini CRM com funil de vendas e follow-up automático no WhatsApp: regras configuráveis, horário comercial, sem duplicar mensagem, parada na resposta e opt-out.**

## O problema

Cenário fictício: numa empresa de reformas com 6 pessoas, o orçamento sai e o retorno depende de alguém lembrar. O lead esfria.
Automatizar o retorno é simples. O difícil é fazer isso sem insistência, sem mensagem de madrugada e sem enviar a mesma mensagem duas vezes.

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

Fluxo real de 23 segundos: contato registrado, follow-up enviado, resposta pelo simulador e parada da sequência. O follow-up só vence em 24 h, então o ciclo rodou com data simulada pelo recurso do próprio projeto; por isso o envio aparece com data posterior à resposta. [Detalhes e demais telas](docs/imagens/README.md).

## Ficha técnica

| Campo | Informação |
|---|---|
| Natureza | Estudo de caso fictício |
| Stack | Next.js 15, React 19, TypeScript, Prisma, PostgreSQL, Zod, Vitest, Playwright, n8n |
| Testes | 200 de unidade e integração (111 + 89) e 16 E2E; 24/10/2026, commit `cbbcc47` ([logs](docs/05-qualidade/README.md)) |

Guia da série: [docs/INDEX.md](docs/INDEX.md) · [glossário](docs/GLOSSARIO.md) · [galeria](docs/imagens/README.md).

## O que construí

- Implementei as quatro garantias: envio só em horário comercial (RN-01), nunca a mesma mensagem duas vezes (RN-05), parada quando o lead responde (RN-04) e opt-out por SAIR, PARAR ou STOP (RN-03). ([regras](docs/02-definicao/03-regras-de-negocio.md))
- Garanti a idempotência em dois níveis no banco: chave única na criação do job e reserva atômica antes do envio. ([ADR-003](docs/03-arquitetura/adr/ADR-003-idempotencia.md))
- Construí a fila que respeita a janela comercial em UTC−3: fora do horário a mensagem espera e sai na abertura seguinte. ([RN-02](docs/02-definicao/03-regras-de-negocio.md), [ADR-004](docs/03-arquitetura/adr/ADR-004-agendamento-e-fila.md))
- Implementei retentativa com backoff de 1, 5 e 15 minutos; erro definitivo não tenta de novo. ([RN-11](docs/02-definicao/03-regras-de-negocio.md), [ADR-005](docs/03-arquitetura/adr/ADR-005-retentativa-e-falhas.md))
- Escrevi o motor de regras como funções puras que recebem a hora, testáveis sem esperar o relógio. ([`src/lib/rules`](src/lib/rules))
- Usei o n8n só como agendador: ele dispara o ciclo a cada 5 minutos e toda decisão fica no app. ([ADR-001](docs/03-arquitetura/adr/ADR-001-n8n-ou-jobs-em-codigo.md), [`automations/tick.json`](automations/tick.json))

## Competência → prova

| O que o projeto exercita | Onde está a prova |
|---|---|
| Traduzir "tudo automático" em regras verificáveis | [19 regras com valor padrão](docs/02-definicao/03-regras-de-negocio.md) |
| Idempotência em dois níveis | [ADR-003](docs/03-arquitetura/adr/ADR-003-idempotencia.md) |
| Diagnosticar um defeito só de produção com medição | [ADR-010](docs/03-arquitetura/adr/ADR-010-sem-loading-tsx.md) |
| Recusar escopo com motivo | [Validação do protótipo](docs/04-prototipo/02-validacao-do-prototipo.md): reunião simulada, 2 recusados, 3 adiados, 5 aceitos |
| Rastrear requisito até o teste | [Matriz de rastreabilidade](docs/02-definicao/07-rastreabilidade.md), 25 linhas |
| Escrever mensagem de follow-up com critério | [Boas práticas de mensagem](docs/06-go-live/boas-praticas-de-mensagem.md) |
| Planejar operação e volta atrás | [Rollback](docs/06-go-live/rollback.md) e [runbook](docs/07-pos-go-live/runbook.md), planos sem ensaio |

## Decisão difícil: não enviar duas vezes

Texto de [ADR-003](docs/03-arquitetura/adr/ADR-003-idempotencia.md) e do [registro do dono](docs/01-discovery/03-registro-dono.md).

| | |
|---|---|
| Contexto | O ciclo pode rodar duas vezes seguidas (n8n repetindo a chamada, duas instâncias, execução manual). O dono citou "mandar duas vezes a mesma coisa" como a pior hipótese |
| Alternativas | Consultar "já enviei?" antes de enviar (não resolve execuções simultâneas); lock global do ciclo (serializa tudo e não protege contra repetição em outro momento); chave única por intenção de envio mais reserva atômica |
| Escolha | Duas camadas, ambas no banco: `INSERT ... ON CONFLICT DO NOTHING` sobre a chave regra + lead + ciclo, e `UPDATE ... WHERE status = 'PENDING'` antes de enviar |
| Custo aceito | Se o processo cair entre a reserva e a resposta do provedor, o job vira falha por "estado incerto", sem reenvio, e gera tarefa para a atendente. A mensagem pode não sair; não sai duplicada |
| Quando mudaria | Se o provedor aceitasse chave de idempotência própria, a chave seria repassada e os jobs em estado incerto poderiam ser reenviados com segurança |
| Contexto de escopo | A API oficial exige número dedicado e o dono não quer trocar o dele. Isso levou ao provedor plugável e à ação "criar tarefa" ([registro do dono](docs/01-discovery/03-registro-dono.md)) |

## Evidências

- 200 testes de unidade e integração (111 + 89) e 16 E2E passaram em 24/10/2026, commit `cbbcc47`: [log dos testes](docs/05-qualidade/execucao-test-cbbcc47.txt) e [log do E2E](docs/05-qualidade/execucao-test-e2e-cbbcc47.txt).
- CI verde em 24/10/2026: [run 40097777544](https://github.com/Joaogabrielmaia/Automated-CRM-follow-up-on-WhatsApp/actions/runs/40097777544) no PR (commit `f809e1c`) e [run 40097919766](https://github.com/Joaogabrielmaia/Automated-CRM-follow-up-on-WhatsApp/actions/runs/40097919766) na `main` (commit `e9b0079`).
- 19 regras de negócio (RN-01 a RN-19) e 25 linhas de rastreabilidade, de 23/10/2026, commit `36beb66`: [regras](docs/02-definicao/03-regras-de-negocio.md) e [matriz](docs/02-definicao/07-rastreabilidade.md).
- Medição do defeito do `loading.tsx`: com o arquivo, 3/40 e 5/40 falhas; sem ele, 0/60 e 0/40. Tabela do autor, resultado bruto não arquivado: [ADR-010](docs/03-arquitetura/adr/ADR-010-sem-loading-tsx.md), de 23/10/2026, correção no commit `1cb4fd7`.
- 11 prints do app e uma gravação de 23 s, de 24/10/2026, commit `f809e1c`: [galeria](docs/imagens/README.md).

## Limites

- O envio usa um provedor simulado; o adaptador da WhatsApp Cloud API não foi validado contra a Meta.
- O agendamento do n8n rodando por horas não foi testado.
- Rollback e runbook são planos; nenhum foi ensaiado.
- Acessibilidade e carga não foram testadas.
- RNF-05 (o que fazer hoje em dois cliques) não tem teste automático.

## Evolução prevista

- Arrastar e soltar no quadro, hoje substituído pelo seletor "Mover" ([pedido 1](docs/04-prototipo/02-validacao-do-prototipo.md)).
- Painel com previsão de receita, que depende de histórico de uso ([pedido 8](docs/04-prototipo/02-validacao-do-prototipo.md)).
- Alerta por WhatsApp quando um lead responde ([pedido 9](docs/04-prototipo/02-validacao-do-prototipo.md)).

## Licença

MIT. O código roda localmente; instruções no arquivo [CONTRIBUTING.md](CONTRIBUTING.md).
