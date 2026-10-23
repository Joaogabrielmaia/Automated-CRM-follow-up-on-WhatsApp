# ADR-007: validação do webhook de entrada

**Objetivo:** decidir como o app confia que uma resposta de lead veio de fato do provedor.
**Data:** 22/10/2026 (revisada em 23/10/2026) · **Status:** aceita, com a revisão abaixo
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

## Revisão de 23/10/2026: entrada nativa da Meta

O trade-off acima previa um adaptador no n8n para a API oficial. Ao detalhar o go-live, o adaptador se mostrou pior que a alternativa: ele exigiria um n8n com endereço público e HTTPS, enquanto o app já expõe rotas HTTP.

Passou a existir uma segunda rota, **`/api/webhooks/whatsapp-cloud`**, que fala o formato da Meta:

- `GET` responde à verificação (`hub.mode=subscribe`, `hub.verify_token` igual a `WHATSAPP_VERIFY_TOKEN`) devolvendo o `hub.challenge`.
- `POST` confere `X-Hub-Signature-256` (HMAC-SHA256 do corpo bruto com `WHATSAPP_APP_SECRET`, comparação em tempo constante) antes de qualquer `JSON.parse`.
- Cada mensagem vira uma chamada ao mesmo `handleInboundMessage` do webhook original e do simulador, com o `id` da mensagem como `eventId`. Reenvios da Meta são descartados pela mesma restrição única.
- Texto, resposta de botão e de lista usam o título como texto. Áudio, imagem e outros tipos contam como resposta (interrompem a sequência), mas nunca como SAIR.
- Eventos de status (entregue, lida) e remetentes sem lead respondem 200 sem alterar nada, para a Meta não reenviar.
- Celular antigo que a Meta entrega sem o nono dígito casa com o lead cadastrado com o 9.
- Erro interno responde 500, o que faz a Meta tentar de novo; a deduplicação garante que o que já foi processado não duplica.

A rota original (`/api/webhooks/whatsapp`, formato e assinatura do Pulso) continua, porque o simulador e integrações próprias dependem dela. O n8n **não** participa da entrada de respostas.

**Limitação que continua valendo:** não há janela de tolerância por timestamp, então um corpo capturado e reenviado só é barrado pela deduplicação do `eventId`. E a rota segue o formato descrito na documentação pública da Meta, **testada com payloads montados por mim, nunca com a Meta de verdade**.
