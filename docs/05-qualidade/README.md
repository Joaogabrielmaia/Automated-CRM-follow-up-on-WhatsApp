# Qualidade e testes

**Objetivo:** mostrar o que está testado, como rodar e o que ainda não está coberto.
**Data:** 22/10/2026 · **Status:** testes escritos e passando; lacunas listadas abaixo
**Relacionados:** [regras de negócio](../02-definicao/03-regras-de-negocio.md) · [rastreabilidade](../02-definicao/07-rastreabilidade.md) · [modos de falha](../03-arquitetura/05-modos-de-falha.md)

## Como rodar

| Comando | O que faz | Precisa do banco? |
|---|---|---|
| `npm run test:unit` | 77 testes das regras puras em `src/lib/rules` | Não |
| `npm run test:integration` | 52 testes da engine, do webhook, dos serviços e das rotas | Sim (`npm run db:up`) |
| `npm test` | Unitários e integração juntos | Sim |
| `npm run test:e2e` | 14 testes no navegador (Chromium) | Sim |
| `npm run typecheck` e `npm run lint` | Tipos e estilo | Não |

Cada tipo de teste usa um banco próprio, para nenhum deles apagar os dados de demonstração:

- `pulso`: desenvolvimento e demonstração (`npm run db:seed`).
- `pulso_test`: integração. Criado e migrado automaticamente; os testes esvaziam as tabelas a cada caso. O código recusa limpar um banco cujo nome não termine em `_test`.
- `pulso_e2e`: E2E. Recriado a cada execução, com o seed, antes de o servidor subir (`e2e/prepare-db.ts`). O servidor de teste usa a porta 3100, então não conflita com `npm run dev`.

## O que cada camada prova

**Unitários.** Funções puras que recebem `now`: horário comercial, vencimento das regras, travas antes de enviar, backoff, opt-out, telefone, assinatura do webhook e modelos de mensagem. Nenhum depende de relógio ou banco.

**Integração.** Rodam `runAutomationCycle` e os serviços contra o Postgres de verdade, passando o instante como parâmetro. Assim dá para simular "quinta-feira, 24h depois" sem esperar. Cobrem:

- Idempotência e concorrência: rodar o ciclo duas vezes, ou dois ciclos ao mesmo tempo, envia a mensagem uma única vez (RN-05, ADR-003).
- Sequência completa: boas-vindas, follow-up 1 (24h), follow-up 2 (72h) e Perdido (120h), com o limite de 3 mensagens por ciclo (RN-06, RN-07).
- Horário comercial: mensagem criada à noite fica na fila e sai na abertura seguinte (RN-01, RN-02).
- Resposta, opt-out e pausa cancelam a fila (RN-03, RN-04, RN-10); regra recém-ativada não age sobre o passado (RN-17); intervalo mínimo de 12h (RN-18).
- Falhas: retentativa em 1, 5 e 15 minutos, erro definitivo, falha esgotada com tarefa para a atendente e job travado em `SENDING` (RN-11, ADR-003).
- Webhook: assinatura inválida ou sobre outro corpo, JSON quebrado, payload fora do formato e evento repetido (RNF-09).
- Autorização por papel em cada serviço e na rota do ciclo (RNF-03).
- Painel, healthcheck, cadastro de lead, etapas do funil, modelos e regras.

**E2E.** Fluxos que a atendente e o dono fazem de verdade: login e papéis, cadastro e movimentação de lead (inclusive o motivo obrigatório ao perder), telefone duplicado, busca, criação e ativação de regra, e o simulador de resposta com `SAIR`. Há também uma checagem de que a tela inicial não rola para o lado em 390 px de largura.

## Verificação de que os testes pegam erro

Além de passarem, eu quebrei de propósito duas regras e conferi que os testes falharam, voltando o código em seguida:

- Desliguei a checagem do intervalo mínimo (RN-18): o teste de RN-18 falhou.
- Dei a permissão `rules:write` à atendente: dois testes de autorização falharam.

## O que ainda não está coberto

Fica registrado para não parecer mais pronto do que está.

- **API oficial do WhatsApp.** `src/lib/providers/whatsapp-cloud.ts` não tem teste e não o exercitei contra a Meta. Toda a automação foi exercitada com o `SimulatedProvider`. Antes de usar com clientes reais, esse provedor precisa de teste contra a conta de sandbox da Meta.
- **Navegadores.** O E2E roda só em Chromium e contra `next dev`, não contra o build de produção.
- **Acessibilidade.** Há rótulos e papéis ARIA nos formulários e os seletores dos testes dependem deles, mas não rodei verificação automática (por exemplo axe) nem testei com leitor de tela.
- **Celular.** Só a checagem de rolagem horizontal. O fluxo "O que fazer hoje a dois cliques" (RNF-05) não tem teste automático.
- **Carga.** O lote de 100 jobs por ciclo (RNF-06) está no código, mas não medi o tempo com milhares de leads.
- **Fuso e horário de verão.** O fuso é fixo em UTC−3 (ADR-004). Os testes usam datas de outubro de 2026; não há caso para virada de mês ou de ano.
- **Telas de Modelos, Configurações, Painel e Log da automação.** A regra por trás delas é testada na integração, mas nenhum E2E abre essas páginas.
