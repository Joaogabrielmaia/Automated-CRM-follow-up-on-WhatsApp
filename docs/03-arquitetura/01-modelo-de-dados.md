# Modelo de dados

**Objetivo:** mostrar as tabelas do Pulso e como se relacionam.
**Data:** 22/10/2026 · **Status:** vigente (espelha `prisma/schema.prisma`)
**Relacionados:** [ADR-003](adr/ADR-003-idempotencia.md) · [ADR-006](adr/ADR-006-etapas-configuraveis.md)

```mermaid
erDiagram
    User ||--o{ Lead : "é responsável"
    User ||--o{ Task : "é responsável"
    Stage ||--o{ Lead : "contém"
    Lead ||--o{ Interaction : "tem"
    Lead ||--o{ Task : "tem"
    Lead ||--o{ StageHistory : "passou por"
    Stage ||--o{ StageHistory : "destino"
    Lead ||--o{ AutomationJob : "recebe"
    Lead ||--o{ WebhookEvent : "origina"
    AutomationRule ||--o{ AutomationJob : "gera"
    MessageTemplate ||--o{ AutomationRule : "é usado por"
    AutomationJob ||--o{ AutomationLog : "registra"
    AutomationRun ||--o{ AutomationLog : "agrupa"

    User { string id PK
           string name
           string email UK
           string passwordHash
           enum role "ADMIN | ATTENDANT" }
    Stage { string id PK
            string name
            int position
            enum kind "OPEN | QUOTE | WON | LOST" }
    Lead { string id PK
           string name
           string phone UK "+55DDDNUMERO"
           string source
           string interest
           decimal estimatedValue
           string stageId FK
           string ownerId FK
           string lostReason
           datetime optedOutAt
           bool automationPaused
           datetime lastInboundAt
           datetime lastOutboundAt
           datetime cycleStartedAt
           datetime stageChangedAt
           datetime archivedAt
           datetime anonymizedAt }
    Interaction { string id PK
                  string leadId FK
                  enum type "MESSAGE_OUT | MESSAGE_IN | NOTE | STAGE_CHANGE | SYSTEM"
                  string body
                  datetime createdAt }
    Task { string id PK
           string leadId FK
           string title
           datetime dueAt
           datetime doneAt
           bool createdBySystem }
    StageHistory { string id PK
                   string leadId FK
                   string fromStageId
                   string toStageId FK
                   datetime at }
    MessageTemplate { string id PK
                      string name
                      string body "com {nome} {servico} {valor}" }
    AutomationRule { string id PK
                     string name
                     enum trigger "NEW_LEAD | NO_REPLY | QUOTE_NO_RETURN"
                     int afterMinutes
                     enum action "SEND_MESSAGE | CREATE_TASK | MOVE_TO_LOST"
                     string templateId FK
                     bool active
                     datetime activatedAt }
    AutomationJob { string id PK
                    string idempotencyKey UK
                    string leadId FK
                    string ruleId FK
                    enum status "PENDING | SENDING | SENT | FAILED | CANCELED | SKIPPED"
                    datetime scheduledFor
                    int attempts
                    string reason
                    string providerMessageId }
    AutomationLog { string id PK
                    datetime at
                    string event
                    string detail }
    AutomationRun { string id PK
                    datetime startedAt
                    datetime finishedAt }
    WebhookEvent { string id PK
                   string externalId UK
                   datetime receivedAt }
    Setting { int id PK "sempre 1"
              json businessHours
              int maxMessagesPerCycle }
```

## Decisões que valem lembrar

- `Lead.phone` é único e já normalizado. O lead arquivado continua ocupando o telefone, para não haver dois históricos do mesmo contato.
- `Lead.cycleStartedAt` guarda o início do ciclo sem resposta ([RN-08](../02-definicao/03-regras-de-negocio.md)). É apagado quando o lead responde.
- `AutomationJob.idempotencyKey` é a garantia de [RN-05](../02-definicao/03-regras-de-negocio.md): regra + lead + instante do ciclo.
- `StageHistory` existe só para o painel calcular a passagem entre etapas sem depender de texto livre.
- Valores em reais ficam em `Decimal(10,2)`, nunca em ponto flutuante.
- Não armazeno CPF, endereço, e-mail do lead nem arquivos. Ver [segurança e privacidade](04-seguranca-e-privacidade.md).
