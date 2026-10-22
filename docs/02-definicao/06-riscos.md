# Riscos e mitigações

**Objetivo:** listar o que pode dar errado e o que faço a respeito.
**Data:** 22/10/2026 · **Status:** vigente
**Relacionados:** [regras](03-regras-de-negocio.md) · [modos de falha](../03-arquitetura/05-modos-de-falha.md)

Probabilidade e impacto: B (baixo), M (médio), A (alto).

| ID | Risco | Prob. | Impacto | Mitigação | Regra / ADR |
|---|---|---|---|---|---|
| RSK-01 | Bloqueio do número por excesso de mensagens ou denúncia | M | A | Limite por lead, no máximo 2 follow-ups, opt-out, horário comercial, texto sem tom de cobrança | RN-01, 03, 06, 07 |
| RSK-02 | Envio duplicado (ciclo rodando duas vezes, retentativa, duas instâncias) | M | A | Chave de idempotência única no banco; o envio só ocorre depois de "reservar" a mensagem | RN-05, [ADR-003](../03-arquitetura/adr/ADR-003-idempotencia.md) |
| RSK-03 | Lead irritado com mensagem depois de responder | M | A | Cancelar pendentes na resposta e reconferir o estado do lead imediatamente antes de enviar | RN-04 |
| RSK-04 | n8n fora do ar e a automação parar sem ninguém perceber | M | M | O estado vive no banco; quando o n8n volta, o ciclo recupera o atraso. Healthcheck e indicador de "último ciclo" no painel | [ADR-001](../03-arquitetura/adr/ADR-001-n8n-ou-jobs-em-codigo.md) |
| RSK-05 | Provedor de WhatsApp falhar ou rejeitar a mensagem | M | M | Retentativa com backoff, falha registrada, tarefa para a atendente | RN-11 |
| RSK-06 | Webhook falsificado para parar ou disparar sequências | B | A | Assinatura HMAC, comparação em tempo constante | RNF-09 |
| RSK-07 | Texto automático soar como robô e afastar o lead | M | M | Modelos editáveis pela atendente, guia de boas práticas, piloto pequeno | [boas práticas](../06-deploy-e-go-live/boas-praticas-de-mensagem.md) |
| RSK-08 | Política do WhatsApp exigir modelos aprovados fora da janela de 24h na API oficial | A | M | Registrado como limitação; o provedor oficial exige mapear os modelos antes do uso real | [ADR-002](../03-arquitetura/adr/ADR-002-provedor-de-mensagens.md) |
| RSK-09 | Dados pessoais vazarem ou serem mantidos sem necessidade | B | A | Autorização no servidor, anonimização de lead, sem segredos no repositório | RNF-03, RNF-04 |
| RSK-10 | Eu entregar um MVP grande demais e não terminar | M | A | Corte em ordem definida, escopo fechado em MoSCoW | [escopo](05-escopo-e-backlog.md) |
