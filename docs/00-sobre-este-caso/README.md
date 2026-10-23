# Sobre este caso

**Objetivo:** explicar o cenário do Pulso e em que ordem ler a documentação.
**Data:** 22/10/2026 · **Status:** vigente

## O cenário

O negócio que usei como base é a **Casa Nova Reformas**, uma empresa pequena de reformas e manutenção residencial, com 6 pessoas. Ela recebe leads do Instagram, de indicações e de anúncios, atende tudo pelo WhatsApp pessoal do dono, manda orçamento em PDF e controla tudo em uma planilha. O problema é que o lead esfria depois do orçamento: ninguém lembra de voltar a falar com ele no momento certo.

A empresa, as pessoas, os telefones e os números são exemplos que eu criei. Não conversei com um cliente real para este projeto. Nos registros de discovery, eu mesmo escrevi as perguntas e simulei as respostas, usando uma IA no papel do dono, da atendente e do cliente final, e depois fui refinando o que apareceu. Isso está dito de novo no topo de cada registro, para ninguém confundir com entrevista real.

Se um dia eu conversar com um dono de pequena empresa de verdade, com autorização dele, substituo o discovery por esse material e ajusto o texto.

## Ordem de leitura

1. `01-discovery/` — brainstorm e escolha, negócio, personas, três registros de discovery, processo atual e problemas priorizados.
2. `02-definicao/` — visão, requisitos, regras de negócio, histórias, backlog, riscos e rastreabilidade. Os `sprint-N-review.md` ficam aqui.
3. `03-arquitetura/` — ADRs, modelo de dados, fluxo da automação, segurança e modos de falha.
4. `04-prototipo/` — wireframes e o registro de validação do protótipo.
5. `05-qualidade/` — estratégia de testes, resultado real da última execução e limitações.
6. `06-go-live/` — n8n, plano de rollout, rollback, treinamento e boas práticas de mensagem.
7. `07-pos-go-live/` — runbook, indicadores, retrospectiva, v1.1, roadmap.
8. `entrevista/` — resumo e três perguntas de entrevista por fase.
9. `vitrine/` — textos para currículo, LinkedIn e respostas curtas.

## Convenção de IDs

`RF` requisito funcional · `RNF` não funcional · `RN` regra de negócio · `HU` história de usuário · `P` problema · `ADR` decisão de arquitetura · `RSK` risco.
