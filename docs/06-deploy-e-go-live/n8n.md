# n8n

**Objetivo:** configurar o n8n para chamar o ciclo da automação a cada 5 minutos e dizer o que ele faz e o que não faz.
**Data:** 23/10/2026 · **Status:** o fluxo está versionado em `automations/tick.json`. **Testado:** importa no n8n e executa a chamada autenticada ao ciclo (o app registrou o ciclo). **Não testado:** o agendamento de 5 em 5 minutos rodando por horas.
**Relacionados:** [deploy](deploy.md) · [ADR-001](../03-arquitetura/adr/ADR-001-n8n-ou-jobs-em-codigo.md) · [ADR-009](../03-arquitetura/adr/ADR-009-hospedagem.md) · [runbook](../07-pos-go-live/runbook.md)

## O que o n8n faz e o que não faz

O n8n só **dispara** o ciclo. Toda decisão (quem está devido, horário, limite, idempotência, retentativa) está no app, testada com Vitest. Se o n8n sumir, nada se perde: o estado está no banco e o próximo ciclo recupera o atraso (ver [modos de falha](../03-arquitetura/05-modos-de-falha.md)).

O n8n **não** recebe respostas dos leads. A entrada da API oficial do WhatsApp é uma rota do próprio app (`/api/webhooks/whatsapp-cloud`, ver [ADR-007](../03-arquitetura/adr/ADR-007-validacao-do-webhook.md)). Por isso o n8n pode ficar na minha máquina: só faz chamadas de saída.

## Subir o n8n

O serviço está no `docker-compose.yml` sob o perfil `n8n`, então não sobe junto com o banco. Ele lê três valores do `.env` do repositório:

| No `.env` | Padrão | Para quê |
|---|---|---|
| `AUTOMATION_SECRET` | (obrigatório) | Autoriza o ciclo. Precisa ser **igual** ao da Vercel |
| `PULSO_APP_URL` | vazio = `http://host.docker.internal:3000` (app local) | Endereço do app. Publicado: `https://SEU-APP.vercel.app` |
| `N8N_VERSION` | vazio = a mais recente | Fixe uma versão depois de validar o fluxo |

```bash
docker compose --profile n8n up -d n8n
```

Abra http://localhost:5678 e crie a conta de dono do n8n na primeira vez. Os dados ficam no volume `n8n-data`.

## Importar o fluxo

O fluxo é `automations/tick.json`: dois nós.

1. **A cada 5 minutos** (Schedule Trigger).
2. **Rodar ciclo** (HTTP Request): `POST {{ $env.PULSO_APP_URL }}/api/automation/tick` com o cabeçalho `x-automation-secret` vindo de `$env.PULSO_AUTOMATION_SECRET`, timeout de 60 s e **3 tentativas com 5 s entre elas** (o que o documento de modos de falha promete).

Pela interface: *Workflows → ⋯ → Import from File → `automations/tick.json`*. Ou pela linha de comando:

```bash
docker compose --profile n8n run --rm n8n import:workflow --input=/automations/tick.json
```

(No Git Bash do Windows, prefixe com `MSYS_NO_PATHCONV=1` para o caminho `/automations/...` não ser convertido.)

Depois:

1. Abra o fluxo e clique em *Execute workflow* (ou *Execute step* no nó HTTP). A resposta deve ter `runId`, `created`, `sent`…
2. Ligue o interruptor **Active**. O Schedule Trigger só roda com o fluxo ativo. O arquivo é importado com `"active": false` de propósito.

### Conferir que está funcionando

- `GET /api/health` mostra `"automation": "ok"` e `minutesSinceLastRun` baixo.
- No app, o *Painel* diz "Último ciclo há X minutos".
- No n8n, a aba *Executions* mostra uma execução verde a cada 5 minutos.

### Parar

Desative o fluxo (interruptor **Active**). É a forma mais rápida de parar tudo; ver [rollback](../06-deploy-e-go-live/rollback.md).

## Alerta de agendador parado

O n8n sozinho não avisa quando ele mesmo para. Use um monitor externo no `https://SEU-APP.vercel.app/api/health?strict=1`: ele devolve **503** quando há regra ativa e o último ciclo passou de 15 minutos (ou nunca rodou). Ver [deploy](deploy.md), passo 10.

## Para um piloto de verdade

- Mover o n8n para um VPS pequeno com Docker, com backup do volume `n8n-data`, no dia do primeiro usuário real (ADR-009).
- Definir `N8N_VERSION` com uma versão fixa, para uma atualização automática não quebrar o fluxo.
- Não expor a porta 5678 sem autenticação.
