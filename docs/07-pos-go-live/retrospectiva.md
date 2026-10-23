# Retrospectiva

**Objetivo:** registrar o que funcionou, o que não funcionou e o que muda, para a próxima etapa.
**Data:** 23/10/2026 · **Status:** exemplo para eu reescrever com as minhas próprias impressões
**Relacionados:** [qualidade](../05-qualidade/README.md) · [metas](../02-definicao/01-visao-e-metas.md) · [rollout](../06-go-live/rollout.md) · [riscos](../02-definicao/06-riscos.md) · [ADR-010](../03-arquitetura/adr/ADR-010-sem-loading-tsx.md)

> **Sobre este documento.** Foi escrito por uma IA (Claude) a pedido do autor, como modelo. Ele só afirma o que dá para conferir no repositório, no histórico do git e na sessão de trabalho de 22 e 23/10/2026. **Não há usuário real, piloto nem medição**: nada aqui fala de comportamento de cliente, e as metas M1 a M6 continuam sem medida. Onde falta experiência de uso, o texto diz isso em vez de inventar. O que está em "O que eu senti e o que aprendi" é espaço para o autor trocar pelo que realmente pensa.

## Resumo em quatro linhas

- O motor da automação ficou sólido e bem testado: 200 testes de unidade e integração mais 16 de ponta a ponta, todos passando, e o E2E roda contra o build de produção.
- A documentação estava **à frente do código** em vários pontos. Isso foi corrigido, e as lacunas que o preparo do go-live revelou foram fechadas no código, menos as que dependem de conta externa.
- O achado mais valioso foi um defeito que **só existia em produção**: ações que ficavam em "Salvando…" ou não atualizavam a tela.
- Ninguém usou o Pulso ainda. Tudo o que se sabe sobre "funciona para a Camila" é hipótese, e a Meta nunca foi tocada.

## O que foi entregue

| Área | Resultado |
|---|---|
| Discovery e definição | Cenário Casa Nova Reformas, três registros **simulados**, problemas priorizados, requisitos RF-01 a RF-20, regras RN-01 a RN-19, histórias, riscos, ADRs 001 a 010 |
| Dados | Schema Prisma com 3 migrations |
| Regras | Funções puras (horário, vencimento, travas, backoff, opt-out, telefone, assinatura, modelo, CSV) que recebem `now` |
| Automação | Motor com idempotência, reserva atômica, retentativa, horário comercial, recuperação de job travado, registro de atraso; entrada de respostas (formato do Pulso e nativo da Meta) |
| Telas | Hoje, Funil, Lead, Modelos, Regras, Automação (log), Painel, Simulador, Configurações, Importar CSV |
| Qualidade | 111 unitários, 89 de integração, 16 E2E, em bancos separados; CI escrita |
| Go-live | n8n (fluxo versionado e testado), boas práticas, rollback, rollout, treinamento, runbook, seed de piloto, script de contas |

## O que funcionou

1. **Regras puras com o relógio como parâmetro.** Quase todos os cenários de tempo ("24 horas depois, quinta-feira, fora do horário") viraram teste sem esperar nada. Foi a decisão de arquitetura que mais se pagou.
2. **A restrição única no banco como garantia de idempotência.** O teste com dois ciclos simultâneos mostrou o envio acontecendo uma vez só.
3. **Documentar os "porquês" em ADRs.** Quando uma dúvida surgiu, a resposta já estava escrita. Quando a realidade mudou (webhook nativo da Meta, fim do `loading.tsx`), o ADR ganhou uma revisão ou um irmão novo em vez de ficar desatualizado.
4. **Verificar se os testes pegam erro.** Os primeiros 19 testes de integração passaram de primeira, o que é suspeito. Quebrei de propósito o intervalo mínimo e uma permissão, e três testes falharam como deveriam.
5. **Testar o caminho do piloto do zero** (banco vazio, migrations, seed, contas, login). Era o que um piloto real ia fazer, e deu para provar que funciona antes.
6. **Medir antes de culpar.** Para o travamento das ações, a primeira hipótese (prefetch dos links) estava errada. Só repetir a ação dezenas de vezes e comparar variantes apontou a causa de fato.

## O que não funcionou

Cada item aconteceu e deixou rastro verificável.

1. **Nenhum commit do código até o fim.** Quando a energia caiu, o repositório tinha só os docs commitados; `prisma/`, `src/` e `tests/` inteiros estavam sem versionar. Nada se perdeu porque estava salvo em disco, mas contrariava a convenção do próprio `CLAUDE.md`.
2. **Documento dizendo o que ainda não era verdade.** A matriz de rastreabilidade se dizia atualizada "com os arquivos de teste que existem de fato", mas citava seis arquivos de integração e quatro de E2E que não existiam. As pastas `05`, `06` e `07` estavam vazias e eram linkadas por vários documentos. O Definition of Done pedia "CI verde" e não existia CI.
3. **Seed e tela de login discordando.** A tela anuncia `marcos@casanova.example`; o seed criou outros e-mails e etapas diferentes das dos docs. Só apareceu ao escrever o E2E.
4. **Promessa de log não implementada.** O documento de modos de falha dizia que o log mostraria "atrasado" quando o n8n voltasse; o código não fazia isso.
5. **Verificar só em modo de desenvolvimento.** O E2E passava contra `next dev`. Ao trocar para o build de produção, 8 em 80 ações não atualizavam a tela; sem o `loading.tsx`, 0 em 120. O modo dev escondia o defeito porque é lento e não tem a mesma corrida entre hidratação, fronteira de Suspense e revalidação. Poderia ter ido para a Vercel assim.
6. **Teste que clica antes da página estar pronta.** O build de produção é rápido o bastante para o teste interagir antes de o React hidratar, e o aviso de sucesso não aparecia. O teste agora espera a hidratação. É um problema de teste, não do app, mas só se enxerga separando os dois (o servidor respondia em 67 ms).
7. **Atritos menores de E2E.** O servidor de teste sobe antes do `globalSetup` do Playwright, então o banco ainda não existia; e o Next tem um `role="alert"` próprio que confunde seletores.

## Lacunas que o preparo do go-live revelou

| # | Lacuna | Estado em 23/10/2026 |
|---|---|---|
| 1 | Desativar uma regra não cancelava a fila | **Corrigido** (RN-19) com teste de integração |
| 2 | Não havia como criar um usuário real | **Corrigido**: `npm run user:create`, testado |
| 3 | Adaptador da Meta só enviava texto livre | **Código pronto** (modelo aprovado com parâmetros), testado com rede simulada. **Falta** aprovação na Meta e teste real |
| 4 | Não havia como receber respostas da Meta | **Código pronto**: rota nativa `/api/webhooks/whatsapp-cloud`, testada com payloads meus. **Falta** cadastrar e testar na Meta |
| 5 | Pasta `automations/` vazia | **Corrigido**: `tick.json` importa e executa num n8n real |
| 6 | Migration por conexão com pooler pode travar | **Removida do escopo**: o projeto roda com Postgres local e não tem hospedagem |
| 7 | Sem CI e sem remoto git | **Corrigido**: repositório no GitHub e workflow de CI |
| 8 | Sem importação de leads | **Corrigido**: Importar CSV (RF-20) |
| 9 | Log "Atrasado" prometido e ausente | **Corrigido** |
| 10 | Sem alerta de agendador parado | **Parcial**: `/api/health?strict=1` devolve 503; **falta** cadastrar o monitor externo |
| 11 | Piloto exigia montar etapas, modelos e regras à mão | **Corrigido**: `npm run db:seed:pilot` |
| 12 | `loading.tsx` travando ações em produção | **Corrigido** (ADR-010) |

Os itens 3, 4 e 10 só se encerram com contas externas (Meta, monitor). Por isso o [rollout](../06-go-live/rollout.md) continua começando **sem envio**: só lembretes para a atendente.

## Metas: o que se sabe

| Meta | Situação |
|---|---|
| M1 a M6 | **Não medidas.** Não houve uso real. As métricas M1, M2, M3 e M5 saem do que o sistema já registra; M4 (15% de resposta) depende do comportamento do lead e continua sendo um chute |

## Riscos: o que mudou

- **RSK-02 (duplicidade) e RSK-03 (mensagem após resposta):** cobertos por teste automatizado, incluindo concorrência. Risco menor do que no início.
- **RSK-08 (modelos aprovados da Meta):** o código agora suporta modelo aprovado, mas o risco continua alto até a Meta aprovar os textos e eu testar de verdade.
- **RSK-04 (n8n parado sem ninguém perceber):** agora há o evento "Atrasado", o campo `automation` no health e o modo `?strict=1` para um monitor. Continua dependendo de cadastrar o monitor.
- **Novo, e fechado:** a desativação de regra que não esvaziava a fila.
- **Novo, aberto:** a Meta pode se comportar diferente do que a documentação pública e meus payloads sugerem.

## O que eu faria diferente

1. **Commit por entrega, desde o primeiro dia de código.** Custa um minuto e teria evitado o susto da queda de luz.
2. **Rodar o E2E contra o build de produção desde o início.** O defeito do `loading.tsx` teria aparecido na primeira semana, e não no último dia.
3. **Escrever a matriz de rastreabilidade a partir do que existe**, ou gerá-la, em vez de preencher com o que está planejado.
4. **Criar a CI e o remoto no começo.** Com testes assim, um workflow de poucas linhas já daria o "CI verde" do Definition of Done.
5. **Começar o go-live por uma lista de "o que quebra no mundo real"**, antes de escrever os guias. As lacunas 1, 2, 3 e 4 só apareceram quando tentei descrever o go-live passo a passo.
6. **Testar o adaptador do WhatsApp na sandbox da Meta mais cedo**, porque a exigência de modelos muda o produto, não só a integração.

## Ações

| Prioridade | Ação | Origem |
|---|---|---|
| Alta | Ligar o n8n, ativar o fluxo e cadastrar o monitor em `/api/health?strict=1` | Lacunas 5 e 10 |
| Alta | Rodar o [treinamento](../06-go-live/treinamento.md) e começar a fase 1 do rollout | Rollout |
| Média | Abrir conta WhatsApp Business, submeter os modelos e testar envio e webhook na sandbox da Meta; anotar divergências | Lacunas 3 e 4 |
| Média | Alerta ativo por e-mail quando o monitor externo disparar | RSK-04 |
| Baixa | Teste automatizado do fluxo "O que fazer hoje em dois cliques" e verificação automática de acessibilidade | [qualidade](../05-qualidade/README.md) |
| Baixa | Recuperação de senha e limite de tentativas de login | [ADR-008](../03-arquitetura/adr/ADR-008-autenticacao.md) |
| Baixa | Testar E2E em mais de um navegador | [qualidade](../05-qualidade/README.md) |

## O que eu senti e o que aprendi

*(Espaço para o autor. Sugestões de perguntas: o que me surpreendeu? Em que momento tive mais dúvida da decisão? O que explicaria diferente numa entrevista? O que me deu mais orgulho?)*
