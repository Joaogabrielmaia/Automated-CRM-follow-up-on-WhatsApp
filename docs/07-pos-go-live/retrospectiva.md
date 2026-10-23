# Retrospectiva

**Objetivo:** registrar o que funcionou, o que não funcionou e o que muda, para a próxima etapa.
**Data:** 23/10/2026 · **Status:** exemplo para eu reescrever com as minhas próprias impressões
**Relacionados:** [qualidade](../05-qualidade/README.md) · [metas](../02-definicao/01-visao-e-metas.md) · [rollout](../06-deploy-e-go-live/rollout.md) · [riscos](../02-definicao/06-riscos.md)

> **Sobre este documento.** Foi escrito por uma IA (Claude) a pedido do autor, como modelo. Ele só afirma o que dá para conferir no repositório, no histórico do git e na sessão de trabalho de 22 e 23/10/2026. **Não há usuário real, piloto nem medição**: nada aqui fala de comportamento de cliente, e as metas M1 a M6 continuam sem medida. Onde falta experiência de uso, o texto diz isso em vez de inventar. O que está em "O que eu senti" ou "o que eu faria" é proposta para o autor trocar pelo que realmente pensa.

## Resumo em quatro linhas

- O motor da automação ficou sólido e bem testado: 129 testes de unidade e integração mais 14 de ponta a ponta, todos passando.
- A documentação estava **à frente do código** em vários pontos (arquivos citados que não existiam, links quebrados, promessas não implementadas). Isso foi corrigido nesta rodada.
- Ao preparar o go-live apareceram lacunas reais que bloqueiam o envio pelo WhatsApp de verdade.
- Ninguém usou o Pulso ainda. Tudo o que se sabe sobre "funciona para a Camila" é hipótese.

## O que foi entregue

| Área | Resultado |
|---|---|
| Discovery e definição | Cenário Casa Nova Reformas, três registros **simulados**, problemas priorizados, requisitos, regras RN-01 a RN-18, histórias, riscos, ADRs 001 a 009 |
| Dados | Schema Prisma com 2 migrations |
| Regras | Funções puras (horário, vencimento, travas, backoff, opt-out, telefone, assinatura, modelo) que recebem `now` |
| Automação | Motor com idempotência, reserva atômica, retentativa, horário comercial e recuperação de job travado; entrada de respostas |
| Telas | Hoje, Funil, Lead, Modelos, Regras, Automação (log), Painel, Simulador, Configurações |
| Qualidade | 77 unitários, 52 de integração, 14 E2E, em bancos separados (`pulso_test`, `pulso_e2e`) |
| Go-live | Deploy, n8n, boas práticas, checklist, rollback, rollout, treinamento, runbook |

## O que funcionou

1. **Regras puras com o relógio como parâmetro.** Quase todos os cenários de tempo ("24 horas depois, quinta-feira, fora do horário") viraram teste sem esperar nada. Foi a decisão de arquitetura que mais se pagou.
2. **A restrição única no banco como garantia de idempotência.** O teste com dois ciclos simultâneos mostrou o envio acontecendo uma vez só.
3. **Documentar os "porquês" em ADRs.** Quando uma dúvida surgiu (por que o webhook tem formato próprio? por que o n8n só dispara o ciclo?), a resposta já estava escrita.
4. **Verificar se os testes pegam erro.** Os 19 primeiros testes de integração passaram de primeira, o que é suspeito. Quebrei de propósito o intervalo mínimo entre mensagens e uma permissão da atendente, e três testes falharam como deveriam.
5. **Separar bancos por tipo de teste.** O desenvolvimento, a integração e o E2E não apagam os dados uns dos outros, e o código recusa limpar um banco cujo nome não termine em `_test`.

## O que não funcionou

Cada item abaixo aconteceu e deixou rastro verificável.

1. **Nenhum commit do código até o fim.** Quando a energia caiu, o repositório tinha só os docs commitados; `prisma/`, `src/` e `tests/` inteiros estavam sem versionar. Nada se perdeu porque estava salvo em disco, mas era um risco real e contraria a convenção do próprio `CLAUDE.md` (um commit por entrega lógica).
2. **Documento dizendo o que ainda não era verdade.** A matriz de rastreabilidade estava marcada como "atualizada com os arquivos de teste que existem de fato", mas citava seis arquivos de integração e quatro de E2E que não existiam. As pastas `05`, `06` e `07` estavam vazias e eram linkadas por vários documentos (`deploy.md`, `n8n.md`, `runbook.md`, `boas-praticas-de-mensagem.md`, `automations/README.md`). O Definition of Done pede "CI verde", e não existe CI.
3. **Seed e tela de login discordando.** A tela anuncia `marcos@casanova.example` e `camila@casanova.example`; o seed criou outros e-mails e etapas diferentes das dos docs. Só apareceu ao escrever o teste E2E.
4. **Promessa de log não implementada.** O documento de modos de falha diz que, quando o n8n volta, o log mostra o motivo "atrasado". O código não faz isso.
5. **Atritos de teste E2E.** O servidor de teste sobe antes do `globalSetup` do Playwright, então o banco ainda não existia e a primeira execução esgotou os 120 s de espera. Os seletores também tropeçaram duas vezes: o Next tem um elemento `role="alert"` próprio, e procurar um campo logo depois de um clique, sem esperar a navegação, achou os campos da página anterior.

## Lacunas que o preparo do go-live revelou

Estas são as descobertas mais importantes da rodada, porque bloqueiam o uso real:

| # | Lacuna | Consequência | Estado |
|---|---|---|---|
| 1 | **Desativar uma regra não cancela a fila.** O motor processa jobs pendentes sem conferir se a regra segue ativa | O "botão" de desligar não para o que já está enfileirado | Documentado em [rollback](../06-deploy-e-go-live/rollback.md); **sem correção** |
| 2 | **Não havia como criar um usuário real.** Só o seed, com senha pública | Impossível um piloto seguro | Corrigido com `npm run user:create` (testado no banco E2E) |
| 3 | **Adaptador da API oficial nunca testado** e só envia texto livre | A Meta exige modelos aprovados para a primeira mensagem e fora de 24 h (RSK-08): os follow-ups seriam rejeitados | Aberto; bloqueia a fase 3 do rollout |
| 4 | **Não existe fluxo para receber respostas da Meta.** O webhook aceita o formato do Pulso | Com a API oficial, nenhuma resposta chegaria; o SAIR não funcionaria | Aberto; desenhado em [n8n](../06-deploy-e-go-live/n8n.md) |
| 5 | **Pasta `automations/` vazia**; o fluxo do n8n nunca foi montado | Sem ciclo automático | Guia escrito; fluxo a montar |
| 6 | **Migration pelo pooler do Neon não validada** | O primeiro deploy pode travar | Anotado em [deploy](../06-deploy-e-go-live/deploy.md) |
| 7 | **Sem CI e sem remoto git** | Nada roda os testes a cada mudança | Aberto |
| 8 | **Sem importação de leads** em lote | Migrar a planilha é manual | Aberto; viável só para piloto pequeno |

Por causa das lacunas 3 e 4, o [rollout](../06-deploy-e-go-live/rollout.md) começa **sem envio**: só lembretes para a atendente.

## Metas: o que se sabe

| Meta | Situação |
|---|---|
| M1 a M6 | **Não medidas.** Não houve uso real. As métricas M1, M2, M3 e M5 saem do que o sistema já registra; M4 (15% de resposta) depende do comportamento do lead e continua sendo um chute |

## Riscos: o que mudou

- **RSK-02 (duplicidade) e RSK-03 (mensagem após resposta):** cobertos por teste automatizado, incluindo concorrência. Risco menor do que no início.
- **RSK-08 (modelos aprovados da Meta):** passou de "limitação registrada" a **bloqueio do envio real**.
- **RSK-04 (n8n parado sem ninguém perceber):** o painel e o health mostram o último ciclo, mas não há alerta ativo; alguém precisa olhar. Segue médio.
- **Novo:** a desativação de regra que não esvazia a fila (lacuna 1). Não estava nos riscos.

## O que eu faria diferente

1. **Commit por entrega, desde o primeiro dia de código.** Custa um minuto e teria evitado o susto da queda de luz.
2. **Escrever a matriz de rastreabilidade a partir do que existe**, ou gerá-la, em vez de preencher com o que está planejado.
3. **Criar o CI e o remoto no começo.** Com testes assim, um workflow de poucas linhas já daria o "CI verde" do Definition of Done.
4. **Começar o go-live por uma lista de "o que quebra no mundo real"**, antes de escrever os guias. As lacunas 1, 2, 3 e 4 apareceram só quando tentei descrever um deploy passo a passo.
5. **Testar o adaptador do WhatsApp na sandbox da Meta mais cedo**, porque a exigência de modelos muda o produto, não só a integração.

## Ações

| Prioridade | Ação | Origem |
|---|---|---|
| Alta | Cancelar a fila quando a regra for desativada (guarda `RULE_INACTIVE` no motor + teste de integração) | Lacuna 1 |
| Alta | Criar o remoto no GitHub e um workflow de CI com `typecheck`, `lint` e `test` | Lacuna 7 |
| Alta | Montar e exportar o fluxo 1 do n8n | Lacuna 5 |
| Alta | Fazer o primeiro deploy e validar a migration pelo pooler (`directUrl` se precisar) | Lacuna 6 |
| Média | Marcar mensagens atrasadas no log, como o documento de modos de falha promete (ou corrigir o documento) | Item 4 acima |
| Média | Alerta ativo para "ciclo parado" (e-mail pelo n8n quando o último ciclo passar de 15 minutos) | RSK-04 |
| Média | Importação de leads por CSV | Lacuna 8 |
| Média | Adaptar e testar o provedor da Meta (modelos aprovados) e construir o fluxo 2 | Lacunas 3 e 4 |
| Baixa | Teste automatizado do fluxo "O que fazer hoje em dois cliques" e verificação automática de acessibilidade | [qualidade](../05-qualidade/README.md) |
| Baixa | Recuperação de senha e limite de tentativas de login | [ADR-008](../03-arquitetura/adr/ADR-008-autenticacao.md) |

## O que eu senti e o que aprendi

*(Espaço para o autor. Sugestões de perguntas: o que me surpreendeu? Em que momento tive mais dúvida da decisão? O que explicaria diferente numa entrevista? O que me deu mais orgulho?)*
