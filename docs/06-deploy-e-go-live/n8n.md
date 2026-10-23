# n8n

**Objetivo:** configurar o n8n para chamar o ciclo da automação a cada 5 minutos e dizer o que ele faz e o que não faz.
**Data:** 23/10/2026 · **Status:** guia escrito a partir do [ADR-001](../03-arquitetura/adr/ADR-001-n8n-ou-jobs-em-codigo.md), do `docker-compose.yml` e da rota `/api/automation/tick`. **O fluxo ainda não foi montado nem exportado** (`automations/` está vazia).
**Relacionados:** [deploy](deploy.md) · [ADR-009](../03-arquitetura/adr/ADR-009-hospedagem.md) · [ADR-007](../03-arquitetura/adr/ADR-007-validacao-do-webhook.md) · [runbook](../07-pos-go-live/runbook.md)

## O que o n8n faz e o que não faz

O n8n só **dispara** o ciclo. Toda decisão (quem está devido, horário, limite, idempotência, retentativa) está no app, testada com Vitest. Se o n8n sumir, nada se perde: o estado está no banco e o próximo ciclo recupera o atraso (ver [modos de falha](../03-arquitetura/05-modos-de-falha.md)).

## Subir o n8n

O serviço está no `docker-compose.yml` sob o perfil `n8n`, então não sobe junto com o banco:

```bash
docker compose --profile n8n up -d n8n
```

Abra http://localhost:5678 e crie a conta de dono do n8n na primeira vez. Os dados ficam no volume `n8n-data`.

O compose entrega ao n8n três variáveis, que os nós leem com `{{ $env.NOME }}` (por isso `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`):

| Variável no n8n | Vem de | Para quê |
|---|---|---|
| `PULSO_APP_URL` | Fixa no compose: `http://host.docker.internal:3000` | Endereço do app |
| `PULSO_AUTOMATION_SECRET` | `AUTOMATION_SECRET` do `.env` | Autoriza o ciclo |
| `PULSO_WEBHOOK_SECRET` | `WEBHOOK_SECRET` do `.env` | Assina respostas (fluxo 2) |

### Apontar para o app na Vercel

O endereço fixo do compose serve para o app local. Para chamar o app publicado, crie `docker-compose.override.yml` (o Docker o lê sozinho; não versione se tiver segredo):

```yaml
services:
  n8n:
    environment:
      - PULSO_APP_URL=https://SEU-APP.vercel.app
```

E ponha no `.env` local o **mesmo** `AUTOMATION_SECRET` cadastrado na Vercel. Se os valores diferirem, o app responde 401 e nenhum ciclo roda.

## Fluxo 1: disparar o ciclo (obrigatório)

Quatro nós:

1. **Schedule Trigger.** Intervalo de 5 minutos.
2. **HTTP Request.**
   - Método `POST`, URL `{{ $env.PULSO_APP_URL }}/api/automation/tick`.
   - Cabeçalho `x-automation-secret` = `{{ $env.PULSO_AUTOMATION_SECRET }}`.
   - Timeout de 60000 ms (o limite da rota).
   - Em *Settings* do nó: **Retry On Fail** ligado, 3 tentativas, 5000 ms entre elas (é o que o documento de modos de falha promete).
3. **Fim.** A resposta é o resumo do ciclo: `{ runId, created, sent, failed, skipped, canceled, rescheduled }`. Não precisa de mais nada.
4. *(Opcional)* Um segundo fluxo com **Error Trigger** que avise por e-mail quando o primeiro falhar.

Depois de montar: clique em *Execute workflow* e confira que a resposta tem `runId`. Ligue o interruptor **Active**: o Schedule Trigger só roda com o fluxo ativo.

Salve o fluxo no repositório: *Download* no menu do fluxo e guarde o JSON em `automations/tick.json`. Assim o ambiente é reproduzível.

### Conferir que está funcionando

- `GET /api/health` mostra `lastAutomationRunAt`; deve ter no máximo uns 5 minutos.
- No app, a tela *Painel* diz "Último ciclo há X minutos".
- No n8n, a aba *Executions* mostra uma execução verde a cada 5 minutos.

### Parar

Desative o fluxo (interruptor **Active**). É a forma mais rápida de parar tudo; ver [rollback](rollback.md).

## Fluxo 2: respostas pela API oficial do WhatsApp (não construído)

O webhook do Pulso (`POST /api/webhooks/whatsapp`) aceita **o formato do Pulso**, não o da Meta ([ADR-007](../03-arquitetura/adr/ADR-007-validacao-do-webhook.md)):

```json
{ "eventId": "wamid.XYZ", "from": "5531999990101", "text": "Quero fechar", "timestamp": "2026-10-23T14:00:00Z" }
```

com o cabeçalho `x-pulso-signature: sha256=<HMAC-SHA256 do corpo bruto com WEBHOOK_SECRET>`.

Para a API oficial é preciso um adaptador. Desenho:

1. **Webhook node** (HTTPS público) recebendo a Meta. O `GET` de verificação devolve o `hub.challenge`.
2. Conferir a assinatura da Meta (`X-Hub-Signature-256`) com o segredo do app Meta.
3. Percorrer `entry[].changes[].value.messages[]` e, para cada mensagem de texto, montar `eventId` (o `id` da mensagem), `from`, `text.body` e `timestamp`.
4. Assinar o corpo com `WEBHOOK_SECRET` e enviar com **HTTP Request**.

Cuidados:

- A assinatura é sobre o **texto exato** enviado. Gere a string uma vez e envie essa mesma string como corpo bruto, sem deixar o n8n reserializar o JSON.
- Calcular HMAC num nó Code exige liberar o módulo `crypto` (`NODE_FUNCTION_ALLOW_BUILTIN=crypto` no ambiente do n8n).
- Este fluxo exige um endereço **público**. O n8n na minha máquina só faz chamadas de saída; para receber a Meta, o n8n precisa de um VPS com HTTPS ou de um túnel. Isso mexe na decisão do [ADR-009](../03-arquitetura/adr/ADR-009-hospedagem.md) e entra no [rollout](rollout.md) como pré-requisito da fase 3.
- Enquanto o fluxo 2 não existir, as respostas só entram pelo **simulador** (e pelo script `npm run simulate:reply`). Na fase de lembretes isso não importa: a atendente conversa pelo WhatsApp dela.

## Para um piloto de verdade

- Mover o n8n para um VPS pequeno com Docker (no dia do primeiro usuário real, conforme o ADR-009), com HTTPS e backup do volume `n8n-data`.
- Trocar `n8nio/n8n:latest` por uma versão fixa no compose, para uma atualização automática não quebrar o fluxo.
- Não expor a porta 5678 sem autenticação.
