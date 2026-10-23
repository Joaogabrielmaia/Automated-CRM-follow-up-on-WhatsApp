# Fluxos do n8n

Esta pasta é montada no n8n em `/automations` (somente leitura) e guarda os fluxos exportados.

**Estado atual: vazia.** Os fluxos ainda não foram montados nem exportados. O passo a passo está em [docs/06-deploy-e-go-live/n8n.md](../docs/06-deploy-e-go-live/n8n.md).

Quando existirem, o esperado é:

| Arquivo | O que faz |
|---|---|
| `tick.json` | Dispara `POST /api/automation/tick` a cada 5 minutos, com 3 tentativas |
| `whatsapp-inbound.json` | Adaptador entre o webhook da Meta e o webhook do Pulso (não construído) |
