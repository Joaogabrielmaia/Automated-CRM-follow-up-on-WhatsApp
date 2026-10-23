# Qualidade e testes

**Objetivo:** mostrar o que está testado, como rodar e o que ainda não está coberto.
**Data:** 23/10/2026 · **Status:** testes escritos e passando; lacunas listadas abaixo
**Relacionados:** [regras de negócio](../02-definicao/03-regras-de-negocio.md) · [rastreabilidade](../02-definicao/07-rastreabilidade.md) · [modos de falha](../03-arquitetura/05-modos-de-falha.md) · [ADR-010](../03-arquitetura/adr/ADR-010-sem-loading-tsx.md)

## Como rodar

| Comando | O que faz | Precisa do banco? |
|---|---|---|
| `npm run test:unit` | 111 testes das regras puras e do provedor da Meta | Não |
| `npm run test:integration` | 89 testes da engine, dos webhooks, dos serviços, da importação e das rotas | Sim (`npm run db:up`) |
| `npm test` | Unitários e integração juntos (200) | Sim |
| `npm run test:e2e` | 16 testes no navegador (Chromium), contra o **build de produção** | Sim |
| `npm run typecheck` e `npm run lint` | Tipos e estilo | Não |

A mesma sequência roda a cada push na CI (`.github/workflows/ci.yml`), com um Postgres de verdade. **Ela ainda não rodou no GitHub**: o repositório só existe local até o primeiro push.

Cada tipo de teste usa um banco próprio, para nenhum deles apagar os dados de demonstração:

- `pulso`: desenvolvimento e demonstração (`npm run db:seed`).
- `pulso_test`: integração. Criado e migrado automaticamente; os testes esvaziam as tabelas a cada caso. O código recusa limpar um banco cujo nome não termine em `_test`.
- `pulso_e2e`: E2E. Recriado a cada execução, com o seed, antes de o servidor subir (`e2e/prepare-db.ts`). O servidor de teste faz `next build` numa pasta própria (`.next-e2e`) e sobe com `next start` na porta 3100, então não conflita com `npm run dev`.

## O que cada camada prova

**Unitários.** Funções puras que recebem `now`: horário comercial, vencimento das regras, travas antes de enviar (incluindo regra desativada), backoff, opt-out, telefone (incluindo celular sem o nono dígito), assinatura do webhook, modelos de mensagem (incluindo parâmetros do modelo aprovado), leitura de CSV e o provedor da WhatsApp Cloud API com a rede simulada. Nenhum depende de relógio ou banco.

**Integração.** Rodam `runAutomationCycle` e os serviços contra o Postgres de verdade, passando o instante como parâmetro. Assim dá para simular "quinta-feira, 24h depois" sem esperar. Cobrem:

- Idempotência e concorrência: rodar o ciclo duas vezes, ou dois ciclos ao mesmo tempo, envia a mensagem uma única vez (RN-05, ADR-003).
- Sequência completa: boas-vindas, follow-up 1 (24h), follow-up 2 (72h) e Perdido (120h), com o limite de 3 mensagens por ciclo (RN-06, RN-07).
- Horário comercial: mensagem criada à noite fica na fila e sai na abertura seguinte (RN-01, RN-02).
- Resposta, opt-out e pausa cancelam a fila (RN-03, RN-04, RN-10); regra nova não age sobre o passado (RN-17); intervalo mínimo de 12h (RN-18); **desativar uma regra cancela a fila dela (RN-19)**.
- Falhas: retentativa em 1, 5 e 15 minutos, erro definitivo, falha esgotada com tarefa para a atendente, job travado em `SENDING` e evento **Atrasado** quando o agendador ficou parado (RN-11, ADR-003).
- Modelo aprovado na Meta: as variáveis viram parâmetros na ordem do texto (RSK-08).
- Webhooks: o do formato do Pulso e o **nativo da Meta** (verificação por token, assinatura `X-Hub-Signature-256`, celular sem o 9, áudio contando como resposta, status ignorado, reenvio descartado) (RNF-09).
- Autorização por papel em cada serviço e na rota do ciclo (RNF-03).
- Painel; healthcheck (incluindo ciclo parado e o modo `?strict=1`); cadastro de lead, etapas, modelos e regras; **importação de CSV** (telefone repetido, linha inválida, automação pausada, arquivo grande); **seed de piloto** (regras desligadas, sem contas, idempotente).

**E2E.** Fluxos que a atendente e o dono fazem de verdade: login e papéis, cadastro e movimentação de lead (inclusive o motivo obrigatório ao perder), telefone duplicado, busca, importação de um CSV com linha inválida, criação e ativação de regra, e o simulador de resposta com `SAIR`. Há também uma checagem de que a tela inicial não rola para o lado em 390 px de largura. Rodei a suíte três vezes seguidas sem falha.

## Verificações além dos testes

- **Os testes pegam erro?** Quebrei de propósito o intervalo mínimo (RN-18) e uma permissão da atendente, e os testes falharam; restaurei o código em seguida.
- **Caminho do piloto do zero.** Num banco vazio: migrations, seed de piloto, duas contas reais, app de produção no ar, login, regras todas inativas, cadastro de lead pela atendente.
- **n8n de verdade.** O fluxo `automations/tick.json` foi importado e executado num n8n em Docker contra o app de produção, e o app registrou o ciclo.
- **Defeito encontrado só em produção.** O E2E contra `next dev` passava; contra o build de produção, 8 em 80 ações não atualizavam a tela por causa do `loading.tsx`. Medi, removi o arquivo e repeti (0 em 120). Registro completo no [ADR-010](../03-arquitetura/adr/ADR-010-sem-loading-tsx.md).

## O que ainda não está coberto

Fica registrado para não parecer mais pronto do que está.

- **WhatsApp Cloud API de verdade.** O envio, o envio de modelo e o webhook da Meta foram escritos conforme a documentação pública e testados com a rede e os payloads simulados por mim. **Nunca falaram com a Meta.** A Meta pode devolver um erro ou um formato que eu não previ. Antes de usar com clientes reais, é preciso testar na sandbox da Meta (ver [rollout](../06-go-live/rollout.md), seção C).
- **Hospedagem.** O projeto não foi publicado em nenhum servidor: é para ser rodado localmente. O que depende só do código (migrations em banco vazio, build de produção) foi testado.
- **CI no GitHub.** O workflow existe e o YAML é válido; conferir o resultado na aba *Actions*.
- **Agendamento contínuo do n8n.** Executei a chamada uma vez; não deixei o agendador rodando por horas.
- **Navegadores.** O E2E roda só em Chromium.
- **Acessibilidade.** Há rótulos e papéis ARIA nos formulários e os seletores dos testes dependem deles, mas não rodei verificação automática (por exemplo axe) nem testei com leitor de tela.
- **Celular.** Só a checagem de rolagem horizontal. O fluxo "O que fazer hoje a dois cliques" (RNF-05) não tem teste automático.
- **Carga.** O lote de 100 jobs por ciclo (RNF-06) está no código, mas não medi o tempo com milhares de leads.
- **Fuso e horário de verão.** O fuso é fixo em UTC−3 (ADR-004). Os testes usam datas de outubro de 2026; não há caso para virada de mês ou de ano.
- **Telas de Modelos, Configurações, Painel e Log da automação.** A regra por trás delas é testada na integração, mas nenhum E2E abre essas páginas.
