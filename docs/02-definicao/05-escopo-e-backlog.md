# Escopo, MoSCoW e backlog

**Objetivo:** dizer o que entra, o que fica de fora, e em que ordem construo.
**Data:** 22/10/2026 · **Status:** vigente
**Relacionados:** [requisitos](02-requisitos.md) · [histórias](04-historias-de-usuario.md) · [riscos](06-riscos.md)

## MoSCoW

| Categoria | Itens |
|---|---|
| **Must** | RF-01, 02, 04, 05, 07, 08, 09, 10, 13, 14; RN-01 a RN-06, RN-11, RN-14; RNF-01, 02, 03, 08, 09 |
| **Should** | RF-03, 06, 11, 12, 15, 16, 17, 18, 19; RN-07 a RN-10, RN-12, RN-13, RN-15, RN-16; RNF-04, 05, 07 |
| **Could** | Arrastar e soltar no quadro; exportar leads em CSV; filtros salvos |
| **Won't (agora)** | Ver "Fora do escopo" |

## Escopo do MVP

Tudo que está em Must e Should: login com papéis, leads, funil com etapas configuráveis, histórico, tarefas, modelos, regras, as regras de segurança da automação, webhook com assinatura, painel, log, simulador, seed.

## Fora do escopo (roadmap)

| Item | Por que fica de fora |
|---|---|
| Multiempresa | Dobra o modelo de dados e a autorização. Uma empresa por instalação resolve o cenário |
| WhatsApp com mídia e áudio | A automação envia só texto. Mídia exige tratamento de arquivos e modelos aprovados |
| Chatbot com IA | Responder lead sozinho foi justamente o que o dono e a atendente temem |
| Integração com ERP | O cenário não tem ERP |
| Assinatura digital | Não é parte do problema (retomar contato) |
| Cobrança | Idem |
| Arrastar e soltar no quadro | O botão "Mover para" resolve e é mais acessível. Entra se sobrar tempo |

## Backlog em 3 sprints

### Sprint 1: fundação (HU-01 a HU-05)
Projeto, banco, autenticação e papéis, CRUD de leads, etapas configuráveis, quadro, histórico, tarefas, seed.

### Sprint 2: automação (HU-06 a HU-13, HU-16)
Modelos, regras, provedor (interface, simulado e API oficial), motor de regras, fila com horário comercial, idempotência, retentativa, webhook, opt-out, parada por resposta, orçamento sem retorno, pausa por lead, n8n.

### Sprint 3: visão e qualidade (HU-14, HU-15)
Painel, log, simulador, estados de erro e vazio, acessibilidade, E2E, CI, deploy.

## Definition of Ready

Uma história entra na sprint quando tem: critérios Dado/Quando/Então, requisitos e regras ligados, tela identificada e nenhuma dependência aberta de decisão.

## Definition of Done

- Critérios de aceite atendidos, com teste (unitário, integração ou E2E) para cada regra de negócio envolvida.
- Validação com Zod e checagem de papel no servidor.
- Estados de carregamento, vazio e erro nas telas novas.
- Tipos e lint sem erro; CI verde.
- Documentação e matriz de rastreabilidade atualizadas.
- Commit no padrão Conventional Commits citando os IDs.
