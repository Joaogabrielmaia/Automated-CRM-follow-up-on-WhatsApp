# Do lead que esfria ao follow-up que não incomoda

Guia da série sobre o Pulso, um mini CRM com funil de vendas e follow-up automático no WhatsApp, construído para uma empresa fictícia. Cada pasta de `docs/` é um episódio, na ordem em que o projeto foi pensado. Termos técnicos estão no [glossário](GLOSSARIO.md).

[← Voltar à capa](../README.md)

## Episódios

| Ep. | Tema | Pergunta que responde |
|---|---|---|
| 0 | [Sobre este caso](00-sobre-este-caso/README.md) | Qual é o cenário e o que é real ou simulado? |
| 1 | [Discovery](01-discovery/README.md) | Que problema vale resolver e para quem? |
| 2 | [Definição](02-definicao/README.md) | O que o produto faz e o que fica de fora? |
| 3 | [Arquitetura](03-arquitetura/README.md) | Como foi construído e por quê? |
| 4 | [Protótipo](04-prototipo/README.md) | O que mudou antes de codar? |
| 5 | [Qualidade](05-qualidade/README.md) | O que está testado e o que não está? |
| 6 | [Go-live](06-go-live/README.md) | Como entraria em uso? |
| 7 | [Pós-go-live](07-pos-go-live/README.md) | Como operar e o que fica de lição? |

Galeria dos prints: [imagens](imagens/README.md).

Relatório do ciclo de vida, com sprints, reuniões, requisitos, arquitetura, dados, testes, implantação e evolução: [ciclo-de-vida](ciclo-de-vida/README.md).

## Trilhas de leitura

### Em 2 minutos

1. [README](../README.md)
2. [Tela do lead](imagens/04-lead.png)
3. [Tela de regras](imagens/06-regras.png)
4. [ADR-003: idempotência](03-arquitetura/adr/ADR-003-idempotencia.md)

### Em 10 minutos

1. [README](../README.md)
2. [Tela do lead](imagens/04-lead.png)
3. [Tela de regras](imagens/06-regras.png)
4. [ADR-003: idempotência](03-arquitetura/adr/ADR-003-idempotencia.md)
5. [Reunião simulada com o dono](01-discovery/03-registro-dono.md)
6. [Regras de negócio](02-definicao/03-regras-de-negocio.md)
7. [ADR-010: sem loading.tsx](03-arquitetura/adr/ADR-010-sem-loading-tsx.md)
8. [Qualidade](05-qualidade/README.md)

### Em 30 minutos

1. [README](../README.md)
2. [Tela do lead](imagens/04-lead.png)
3. [Tela de regras](imagens/06-regras.png)
4. [ADR-003: idempotência](03-arquitetura/adr/ADR-003-idempotencia.md)
5. [Reunião simulada com o dono](01-discovery/03-registro-dono.md)
6. [Regras de negócio](02-definicao/03-regras-de-negocio.md)
7. [ADR-010: sem loading.tsx](03-arquitetura/adr/ADR-010-sem-loading-tsx.md)
8. [Qualidade](05-qualidade/README.md)
9. [Fluxo da automação](03-arquitetura/02-fluxo-da-automacao.md)
10. [Modos de falha](03-arquitetura/05-modos-de-falha.md)
11. [Segurança e privacidade](03-arquitetura/04-seguranca-e-privacidade.md)
12. [Validação do protótipo](04-prototipo/02-validacao-do-prototipo.md)
13. [Rollout](06-go-live/rollout.md)
14. [Rollback](06-go-live/rollback.md)

## O que tem em cada pasta

| Pasta | O que tem |
|---|---|
| `docs/00-sobre-este-caso` a `docs/07-pos-go-live` | Um episódio por pasta, com a página de abertura em `README.md` |
| `docs/03-arquitetura/adr` | Decisões de arquitetura. Não existe ADR-009; a numeração segue de 008 para 010 |
| `docs/ciclo-de-vida` | Relatório do ciclo de vida: nove documentos, [sprints](ciclo-de-vida/sprints/README.md), [reuniões](ciclo-de-vida/reunioes/README.md) e [diagramas](ciclo-de-vida/diagramas/README.md) |
| `docs/imagens` | Prints do app e a [galeria](imagens/README.md) |
| `docs/05-qualidade` | Estratégia de testes e os logs de execução (`execucao-*.txt`), com data, commit e comando no cabeçalho |
| [`src`](../src) | O app: telas, rotas, regras puras (`src/lib/rules`), orquestração com banco (`src/lib/automation`) e provedores de mensagem |
| [`prisma`](../prisma) | Schema, migrations e seeds |
| [`tests`](../tests) · [`e2e`](../e2e) | Testes de unidade e integração; testes no navegador |
| [`automations`](../automations) | Fluxo do n8n versionado |
| [`scripts`](../scripts) | Utilitários de linha de comando |
