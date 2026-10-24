# 04 · Arquitetura e ADRs

[← Índice do ciclo de vida](README.md) · [← 03 Requisitos](03-requisitos-e-rastreabilidade.md) · Próximo: [05 Modelo de dados →](05-modelo-de-dados.md)

Os diagramas representam o código atual (`src/`, `prisma/`, `automations/`). Os documentos de origem ficam em [Episódio 3](../03-arquitetura/README.md).

## Contexto (C4, nível 1)

```mermaid
flowchart TB
    AT(["Atendente"]) -->|"funil, tarefas, modelos"| P["Pulso<br/>mini CRM com follow-up"]
    AD(["Dono (Admin)"]) -->|"regras, limites, log, painel"| P
    N8["n8n<br/>agendador"] -->|"POST tick a cada 5 min"| P
    P -->|"envia mensagem"| WA["WhatsApp Cloud API<br/>(adaptador não validado)"]
    WA -->|"webhook com a resposta"| P
    LD(["Lead"]) <-->|"conversa"| WA
```

## Contêineres (C4, nível 2)

```mermaid
flowchart LR
    BR["Navegador"] -->|"HTTPS"| APP
    subgraph APP["App Next.js"]
        UI["Páginas e Server Actions"]
        API["Rotas: tick, webhooks, health"]
        SV["src/lib/services"]
        EN["src/lib/automation<br/>motor e respostas"]
        RL["src/lib/rules<br/>funções puras"]
        PV["src/lib/providers<br/>MessageProvider"]
    end
    UI --> SV
    API --> EN
    API --> SV
    EN --> RL
    SV --> DB[("PostgreSQL")]
    EN --> DB
    EN --> PV
    PV --> SIM["Provedor simulado (padrão)"]
    PV -.-> WAC["WhatsApp Cloud API"]
    N8["n8n"] -->|"x-automation-secret"| API
```

Componentes e regra de dependência: [Diagrama de componentes](../03-arquitetura/03-componentes.md). Regra de negócio fica em `rules` e `automation`, nunca em componente ou rota.

## Fluxo de disparo, janela comercial e parada na resposta

Sequência de um follow-up desde o contato da atendente até a parada na resposta, com as regras que decidem cada passo.

```mermaid
sequenceDiagram
    autonumber
    participant AT as Atendente
    participant APP as App
    participant DB as PostgreSQL
    participant N8 as n8n
    participant PR as MessageProvider
    participant LD as Lead

    AT->>APP: registra o contato feito fora do sistema
    APP->>DB: cycleStartedAt = agora (RN-08)
    N8->>APP: POST tick (a cada 5 min)
    APP->>DB: computeDue: follow-up 1 vence em 24 h (RN-07)
    APP->>DB: INSERT job ON CONFLICT DO NOTHING (RN-05)
    APP->>DB: UPDATE status=SENDING WHERE status=PENDING (reserva)
    APP->>DB: relê o lead: opt-out, pausa, resposta, etapa, limites (RN-03, RN-04, RN-06, RN-10, RN-18)
    alt fora do horário comercial
        APP->>DB: volta a PENDING na próxima janela (RN-02)
    else pode enviar
        APP->>PR: send(to, body, chave)
        PR-->>APP: id da mensagem
        APP->>DB: SENT e interação MESSAGE_OUT
    end
    LD->>APP: resposta pelo webhook assinado (RNF-09)
    APP->>DB: cancela jobs pendentes e cria a tarefa Responder (RN-04)
```

Outros diagramas de sequência: [ciclo e resposta do lead](../03-arquitetura/02-fluxo-da-automacao.md).

## Fluxo do agendador (n8n)

```mermaid
flowchart LR
    T["Gatilho: a cada 5 minutos"] --> H["POST /api/automation/tick<br/>timeout 60 s, 3 tentativas, 5 s entre elas"]
    H --> OK["200 com o resumo do ciclo"]
    H --> NA["401 sem o segredo certo"]
```

Fonte: `automations/tick.json`. O fluxo vem desativado e foi importado e executado uma vez num n8n em Docker (relato do autor, sem log arquivado); o agendamento por horas não foi testado ([n8n](../06-go-live/n8n.md)).

## Estados do lead

O lead não tem um campo de status único. Os estados vêm da etapa (`Stage.kind`), de campos do próprio lead (automação, ciclo) e do registro (arquivado, anonimizado), e são independentes entre si. O primeiro diagrama mostra os movimentos habituais entre etapas; o serviço `moveLead` aceita qualquer etapa como destino.

```mermaid
stateDiagram-v2
    [*] --> Aberta: cadastro ou importação CSV
    Aberta --> Orcamento: mover
    Orcamento --> Aberta: mover
    Aberta --> Ganha: mover
    Orcamento --> Ganha: mover
    Aberta --> Perdida: mover com motivo, ou regra Perdido sem resposta
    Orcamento --> Perdida: mover com motivo, ou regra Perdido sem resposta
    Perdida --> Aberta: reabrir limpa o motivo
    Ganha --> Aberta: reabrir
```

```mermaid
stateDiagram-v2
    [*] --> Ativa
    Ativa --> Pausada: pausar (RN-10)
    Pausada --> Ativa: retomar
    Ativa --> OptOut: SAIR, PARAR ou STOP (RN-03)
    OptOut --> Ativa: Admin remove o opt-out
```

```mermaid
stateDiagram-v2
    [*] --> SemCiclo
    SemCiclo --> EmCiclo: primeira mensagem enviada ou contato manual (RN-08)
    EmCiclo --> SemCiclo: resposta do lead (RN-04)
```

```mermaid
stateDiagram-v2
    [*] --> Ativo
    Ativo --> Arquivado: arquivar
    Arquivado --> Anonimizado: anonimizar (RNF-04)
    Ativo --> Anonimizado: anonimizar (RNF-04)
```

Correspondência com o código: `StageKind` (`OPEN`, `QUOTE`, `WON`, `LOST`) e `applyStageChange` em `src/lib/domain/shared.ts`; `automationPaused`, `optedOutAt`, `cycleStartedAt`, `lastInboundAt` no `Lead`; `moveLead`, `setPaused`, `removeOptOut`, `archiveLead` e `anonymizeLead` em `src/lib/services/leads.ts`. Entrar em etapa ganha ou perdida cancela os envios pendentes; estados do job: [Fluxo da automação](../03-arquitetura/02-fluxo-da-automacao.md#estados-de-um-job).

## Decisões arquiteturais (ADRs)

Cada ADR traz contexto, alternativas, escolha, trade-off e "quando eu mudaria". Não existe ADR-009; a numeração segue de 008 para 010.

| ADR | Decisão | Consequência aceita |
|---|---|---|
| [001](../03-arquitetura/adr/ADR-001-n8n-ou-jobs-em-codigo.md) | n8n só como agendador; regra no código | Duas peças para operar; se o n8n cair nenhum ciclo roda, e o próximo recupera o atraso |
| [002](../03-arquitetura/adr/ADR-002-provedor-de-mensagens.md) | Interface `MessageProvider`, adaptador simulado e da Cloud API | O adaptador da Meta nunca falou com a API real |
| [003](../03-arquitetura/adr/ADR-003-idempotencia.md) | Chave única mais reserva atômica | No pior instante a mensagem pode não sair; não sai duplicada |
| [004](../03-arquitetura/adr/ADR-004-agendamento-e-fila.md) | Fila que espera a janela comercial, fuso fixo UTC−3 | Fuso único e fixo para todos os leads |
| [005](../03-arquitetura/adr/ADR-005-retentativa-e-falhas.md) | Backoff de 1, 5 e 15 minutos; erro definitivo não repete | Falha esgotada vira tarefa para a atendente |
| [006](../03-arquitetura/adr/ADR-006-etapas-configuraveis.md) | Etapas do funil configuráveis, com tipo | O motor depende do tipo da etapa, não do nome |
| [007](../03-arquitetura/adr/ADR-007-validacao-do-webhook.md) | Assinatura HMAC e deduplicação por evento | Segredo compartilhado a proteger |
| [008](../03-arquitetura/adr/ADR-008-autenticacao.md) | E-mail e senha, dois papéis | Sem recuperação de senha nem limite de tentativas |
| [010](../03-arquitetura/adr/ADR-010-sem-loading-tsx.md) | Sem `loading.tsx` | Conteúdo antigo fica visível enquanto a página nova carrega |

## Requisitos de qualidade

| Atributo | Como é atendido | Evidência |
|---|---|---|
| Segurança | Sessão e papel conferidos no servidor; webhook com HMAC; segredos fora do repositório | [Segurança e privacidade](../03-arquitetura/04-seguranca-e-privacidade.md), `tests/integration/authorization.test.ts` |
| Confiabilidade | Idempotência, backoff, recuperação de job travado | `tests/integration/engine.test.ts` |
| Disponibilidade | Estado no banco; o próximo ciclo recupera o atraso; `/api/health` | [Modos de falha](../03-arquitetura/05-modos-de-falha.md) |
| Desempenho | Lote de 100 jobs por ciclo (RNF-06); sem meta de tempo medida | `BATCH_SIZE` em `src/lib/automation/engine.ts` |
| Manutenibilidade | Regras puras recebem a hora (RNF-08) | `tests/unit/` |
| Observabilidade | Cada decisão deixa registro com motivo (RNF-07), tela de log e `AutomationRun` | [Log da automação](../imagens/README.md#7-log-da-automação) |
