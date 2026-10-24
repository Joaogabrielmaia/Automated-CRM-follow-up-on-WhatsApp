# 07 · Testes e qualidade

[← Índice do ciclo de vida](README.md) · [← 06 Desenvolvimento](06-desenvolvimento-e-configuracao.md) · Próximo: [08 Implantação e operação →](08-implantacao-e-operacao.md)

A estratégia completa e as lacunas estão em [Qualidade e testes](../05-qualidade/README.md). Aqui estão a pirâmide, a cobertura dos casos, o registro de defeitos e a interpretação das medições do ADR-010.

## Pirâmide de testes

| Camada | Testes | Arquivos | Banco | Evidência |
|---|---|---|---|---|
| Unidade (funções puras) | 111 | 10 em `tests/unit` | Não | [log da suíte de unidade e integração](../05-qualidade/execucao-test-cbbcc47.txt) |
| Integração (motor, webhooks, serviços, rotas) | 89 | 9 em `tests/integration` | PostgreSQL `pulso_test` | mesmo log |
| Ponta a ponta (Chromium, build de produção) | 16 | 5 em `e2e` | PostgreSQL `pulso_e2e` | [log do E2E](../05-qualidade/execucao-test-e2e-cbbcc47.txt) |

Execução de 24/10/2026, commit `cbbcc47`: 19 arquivos e 200 testes passando (unidade e integração) e 16 E2E passando; tipos e lint sem erro ([typecheck](../05-qualidade/execucao-typecheck-cbbcc47.txt), [lint](../05-qualidade/execucao-lint-cbbcc47.txt)). A mesma sequência passou na CI nos [runs listados](06-desenvolvimento-e-configuracao.md#cicd-e-automações-existentes). Não há teste de contrato, de segurança dedicado, de desempenho nem de acessibilidade automatizada, e a cobertura em percentual não foi medida.

## Cobertura dos casos

| Tipo de caso | Exemplos existentes | Arquivo |
|---|---|---|
| Positivo | Sequência completa: boas-vindas, follow-up 1 (24 h), follow-up 2 (72 h) e Perdido (120 h) | `tests/integration/engine.test.ts` |
| Positivo | Resposta cancela a fila e cria uma única tarefa | `tests/integration/webhook.test.ts` |
| Negativo | Assinatura ausente, errada ou sobre outro corpo responde 401 e não grava nada | `tests/integration/webhook.test.ts`, `tests/integration/webhook-meta.test.ts` |
| Negativo | Telefone inválido ou repetido, mesmo digitado de outro jeito; atendente não cria nem ativa regras | `tests/integration/leads.test.ts`, `tests/integration/authorization.test.ts` |
| Limite | No máximo 3 mensagens por ciclo; intervalo mínimo de 12 h; arquivo CSV acima de 1 MB recusado | `tests/integration/engine.test.ts`, `tests/integration/import.test.ts` |
| Idempotência | Rodar o ciclo duas vezes, ou dois ciclos simultâneos, envia uma vez; webhook repetido descartado | `tests/integration/engine.test.ts`, `tests/integration/webhook.test.ts` |
| Falha e erro | Falha só na primeira tentativa reagenda em 1 min; falha sempre faz 4 tentativas e depois `FAILED` com tarefa; erro definitivo não tenta de novo; job travado em `SENDING` vira falha sem reenvio | `tests/integration/engine.test.ts` |
| Opt-out | SAIR com acento, caixa e pontuação bloqueia; áudio ou imagem contam como resposta, nunca como SAIR | `tests/unit/opt-out.test.ts`, `tests/integration/webhook-meta.test.ts` |
| Parada e travas | Lead pausado, movido para Perdido ou com variável faltando não recebe envio | `tests/integration/engine.test.ts` |
| Regressão | Desativar regra cancela a fila (RN-19); regra nova não age sobre o passado (RN-17) | `tests/integration/engine.test.ts` |
| Segurança | Autorização por papel em cada serviço e na rota do ciclo; segredo errado em `/api/automation/tick` responde 401 | `tests/integration/authorization.test.ts` |
| E2E | Login e papéis, cadastro e movimentação com motivo ao perder, importação de CSV com linha inválida, criação e ativação de regra, simulador com SAIR, rolagem horizontal em 390 px | `e2e/*.spec.ts` |

Rastreabilidade requisito → teste: [matriz](../02-definicao/07-rastreabilidade.md) e [fluxos críticos](03-requisitos-e-rastreabilidade.md#rastreabilidade-ponta-a-ponta).

## Registro de defeitos e causa raiz

| Defeito | Como apareceu | Causa | Correção e regressão |
|---|---|---|---|
| Desativar uma regra não cancelava a fila | Preparo do go-live | O motor só deixava de criar trabalho novo | RN-19, commit `d654fab`; teste "regra desativada" em `engine.test.ts` |
| Log "Atrasado" prometido e inexistente | Preparo do go-live | Documentação à frente do código | Evento no motor, `d654fab`; teste "agendador parado" |
| Seed discordava da tela de login e dos docs | Ao escrever o E2E | Contas e etapas diferentes | `280f792`; E2E de login depende das contas |
| Não havia criação de usuário real | Preparo do go-live | Só existia o seed | script `user:create`, `351c855`; verificação manual (relato do autor, sem log arquivado) |
| Matriz de rastreabilidade citava testes inexistentes | Conferência da matriz | Preenchida pelo planejado | Refeita a partir dos arquivos, `36beb66` |
| `loading.tsx` deixava ações sem atualizar a tela, só em produção | E2E contra `next start` | Gatilho: `revalidatePath` somado à fronteira de Suspense do `loading.tsx`; mecanismo interno do Next não aprofundado | Arquivo removido, `1cb4fd7`; o E2E contra o build cobre o caso |

## Medições do ADR-010

Fonte única: tabela do [ADR-010](../03-arquitetura/adr/ADR-010-sem-loading-tsx.md), marcada como tabela do autor, com resultado bruto não arquivado. Os números são medições históricas de 23/10/2026; este relatório não as repete nem apresenta como nova execução. Cada célula conta quantas vezes, em N repetições da mesma ação contra o servidor de produção (`next build` e `next start`), a tela não atualizou.

| Situação | Simulador (ação presa em "Salvando…") | Regra (selo não atualizou) | O que representa |
|---|---|---|---|
| Com `loading.tsx` e prefetch ligado (estado original) | 4 em 25 | não medido | O defeito aparece no estado original |
| Com `loading.tsx`, sem `revalidatePath` na ação | 0 em 30 | não aplicável | Sem a revalidação o defeito some: um dos dois gatilhos |
| Com `loading.tsx`, prefetch desligado | **3 em 40** (2 em 40 na repetição) | **5 em 40** | O prefetch não é a causa |
| **Sem `loading.tsx`**, prefetch desligado | **0 em 60** (0 em 40 na repetição) | **0 em 60** (0 em 40 na repetição) | Sem o arquivo, nenhuma falha em 100 repetições de cada ação |

Interpretação: o defeito só aparece com o `loading.tsx`, e a remoção do arquivo o elimina nas medições. As amostras são pequenas e sem intervalo de confiança; o ADR registra a medição, não uma explicação do framework. Uma versão anterior da documentação citava "8 em 80" e "0 em 120", sem fonte no repositório, e foi substituída por esta tabela.

## Casos propostos (não executados)

Os casos abaixo cobrem lacunas conhecidas. Nenhum foi escrito nem executado, e nenhum resultado é afirmado.

| Lacuna | Caso proposto |
|---|---|
| RNF-05, "O que fazer hoje" a dois cliques | E2E que abre a tela inicial e conta os cliques até a lista |
| Acessibilidade | Varredura automática (axe) nas telas principais |
| Carga (RNF-06) | Ciclo com mais de 100 jobs vencidos, conferindo o lote e o tempo |
| Contrato com a Meta | Teste do adaptador contra a sandbox da Meta |
| Outros navegadores | E2E em Firefox e WebKit |
| Virada de mês e de ano | Casos de horário comercial nessas datas |

## Reprodução

Os comandos estão no [CONTRIBUTING.md](../../CONTRIBUTING.md). Cada log traz data, commit, versão do Node e comando no cabeçalho.
