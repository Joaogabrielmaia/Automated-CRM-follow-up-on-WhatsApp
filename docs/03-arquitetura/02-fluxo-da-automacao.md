# Fluxo da automação

**Objetivo:** mostrar, passo a passo, o que acontece em um ciclo e quando uma resposta chega.
**Data:** 22/10/2026 · **Status:** vigente
**Relacionados:** [ADR-001](adr/ADR-001-n8n-ou-jobs-em-codigo.md) · [ADR-003](adr/ADR-003-idempotencia.md) · [regras](../02-definicao/03-regras-de-negocio.md)

## Um ciclo (o n8n chama a cada 5 minutos)

```mermaid
sequenceDiagram
    autonumber
    participant N as n8n
    participant A as App (/api/automation/tick)
    participant E as Motor de automação
    participant DB as PostgreSQL
    participant P as MessageProvider

    N->>A: POST tick (x-automation-secret)
    A->>A: confere o segredo
    A->>E: runAutomationCycle(agora)
    E->>DB: jobs em SENDING há mais de 10 min viram FAILED (estado incerto)
    E->>DB: busca leads devidos por regra ativa
    E->>DB: INSERT job ... ON CONFLICT DO NOTHING (chave única)
    loop cada job PENDING com scheduledFor <= agora (até 100)
        E->>DB: UPDATE status=SENDING WHERE status=PENDING (reserva)
        alt reserva falhou (outro ciclo pegou)
            E-->>E: segue para o próximo
        else reservou
            E->>DB: relê o lead (opt-out, pausa, resposta, etapa, limite)
            alt alguma trava
                E->>DB: CANCELED ou SKIPPED + log com o motivo
            else fora do horário comercial
                E->>DB: volta para PENDING na próxima janela + log
            else pode enviar
                E->>P: send(to, body, chave)
                alt sucesso
                    P-->>E: id da mensagem
                    E->>DB: SENT + interação + atualiza ciclo do lead
                else falha temporária
                    E->>DB: PENDING com backoff (1, 5, 15 min) + log
                else falha definitiva ou 4ª tentativa
                    E->>DB: FAILED + tarefa para a atendente + log
                end
            end
        end
    end
    E->>DB: grava AutomationRun com os totais
    A-->>N: 200 com o resumo
```

## Uma resposta do lead chega

```mermaid
sequenceDiagram
    autonumber
    participant L as Lead (WhatsApp)
    participant W as Provedor ou n8n
    participant A as App (/api/webhooks/whatsapp)
    participant DB as PostgreSQL

    L->>W: "Pode ser amanhã?"
    W->>A: POST corpo + x-pulso-signature
    A->>A: HMAC do corpo bruto confere?
    alt assinatura inválida
        A-->>W: 401, nada é gravado
    else válida
        A->>A: valida o JSON com Zod
        A->>DB: INSERT WebhookEvent (eventId único)
        alt eventId repetido
            A-->>W: 200 (duplicado, ignorado)
        else novo
            A->>DB: acha o lead pelo telefone
            alt texto normalizado é SAIR, PARAR ou STOP
                A->>DB: optedOutAt, cancela pendentes, registra
            else resposta comum
                A->>DB: registra a interação, zera o ciclo
                A->>DB: cancela jobs pendentes do lead
                A->>DB: cria tarefa "Responder" para o responsável
            end
            A-->>W: 200
        end
    end
```

## Estados de um job

```mermaid
stateDiagram-v2
    [*] --> PENDING: criado (chave única)
    PENDING --> SENDING: reserva atômica
    SENDING --> SENT: provedor aceitou
    SENDING --> PENDING: fora do horário ou falha temporária
    SENDING --> FAILED: falha definitiva, 4ª tentativa ou estado incerto
    SENDING --> CANCELED: opt-out, resposta, pausa, etapa encerrada
    SENDING --> SKIPPED: limite ou variável faltando
    PENDING --> CANCELED: resposta do lead
    SENDING --> DONE: tarefa criada ou lead movido
    SENT --> [*]
    DONE --> [*]
    FAILED --> [*]
    CANCELED --> [*]
    SKIPPED --> [*]
```
