# Fluxos do n8n

Esta pasta é montada no n8n em `/automations` (somente leitura) e guarda os fluxos exportados.

| Arquivo | O que faz | Estado |
|---|---|---|
| `tick.json` | Dispara `POST /api/automation/tick` a cada 5 minutos, com 3 tentativas | Importa e executa no n8n (testado em 23/10/2026). Vem desativado |

Não há fluxo para receber respostas: a Meta chama direto a rota `/api/webhooks/whatsapp-cloud` do app ([ADR-007](../docs/03-arquitetura/adr/ADR-007-validacao-do-webhook.md)).

Passo a passo e variáveis: [docs/06-deploy-e-go-live/n8n.md](../docs/06-deploy-e-go-live/n8n.md).
