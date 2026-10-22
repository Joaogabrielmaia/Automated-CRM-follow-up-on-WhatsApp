# ADR-007: validação do webhook de entrada

**Objetivo:** decidir como o app confia que uma resposta de lead veio de fato do provedor.
**Data:** 22/10/2026 · **Status:** aceita
**Relacionados:** [RF-13, RNF-09](../../02-definicao/02-requisitos.md) · [segurança](../04-seguranca-e-privacidade.md)

## Contexto

O webhook decide coisas sérias: para uma sequência, coloca um lead em opt-out, cria tarefa. Qualquer pessoa que descubra a URL poderia forjar isso. Provedores também reenviam o mesmo evento quando não recebem confirmação.

## Alternativas

1. Segredo na URL. Vaza em log de acesso e proxy.
2. Lista de IPs do provedor. Frágil e inexistente para o n8n.
3. **Assinatura HMAC-SHA256 do corpo, mais deduplicação por id do evento.**

## Escolha

Opção 3. O chamador envia o cabeçalho `x-pulso-signature: sha256=<hex>`, calculado com `WEBHOOK_SECRET` sobre o **corpo bruto**. O servidor lê o corpo como texto, recalcula e compara com `timingSafeEqual`. Só depois faz o `JSON.parse` e valida com Zod. Cada evento traz um `eventId`, gravado numa tabela com restrição única: o segundo envio devolve 200 sem reprocessar.

## Motivo

HMAC prova posse do segredo e integridade do corpo. A comparação em tempo constante evita vazar o segredo por tempo de resposta. A deduplicação trata o reenvio, que é comportamento normal de webhook.

## Trade-off

O formato é o meu, não o nativo do WhatsApp Cloud API (que assina com outro cabeçalho e traz outro JSON). Para a API oficial é preciso um adaptador na borda (pode ser um fluxo do n8n, ver `automations/`). Também não há janela de tolerância por timestamp, então um corpo capturado e reenviado é barrado só pela deduplicação do `eventId`.

## Quando eu mudaria de ideia

Em produção com a API oficial, trocaria para a validação nativa deles e, se houvesse exposição pública relevante, incluiria timestamp assinado com tolerância de poucos minutos.
