# ADR-005: retentativa e tratamento de falhas

**Objetivo:** definir o que acontece quando o envio falha.
**Data:** 22/10/2026 · **Status:** aceita
**Relacionados:** [RN-11](../../02-definicao/03-regras-de-negocio.md) · [ADR-002](ADR-002-provedor-de-mensagens.md) · [ADR-003](ADR-003-idempotencia.md)

## Contexto

Provedores falham por motivos passageiros (instabilidade, limite de taxa) e definitivos (número inexistente). Tratar os dois igual ou perde mensagem ou insiste à toa.

## Alternativas

1. Não tentar de novo. Simples, mas perde mensagens por falhas de segundos.
2. Tentar de novo imediatamente em laço. Piora o limite de taxa.
3. **Backoff crescente com limite de tentativas, diferenciando erro temporário de definitivo.**

## Escolha

Opção 3. O `ProviderError` traz `retryable`. Erro temporário: espera 1, 5 e 15 minutos (uma tentativa inicial mais 3 retentativas, 4 no total). Erro definitivo ou 4ª falha: o job vira `FAILED`, entra no log com o motivo, e é criada uma tarefa para a atendente conferir o contato por outro meio. O horário da retentativa também passa por `nextSendableTime`, então não escapa da janela comercial.

`backoffMinutes(attempt)` é uma função pura com teste unitário.

## Motivo

Cobre o caso comum (falha passageira) sem aumentar o risco de duplicidade, porque a retentativa reaproveita o mesmo job e a mesma chave ([ADR-003](ADR-003-idempotencia.md)). Falhar de forma visível, com tarefa humana, é melhor do que falhar em silêncio.

## Trade-off

Se o provedor aceitou a mensagem mas a resposta se perdeu na rede, uma retentativa pode duplicar. Sem chave de idempotência do provedor, não consigo eliminar isso, só reduzir (ver [ADR-003](ADR-003-idempotencia.md)).

## Quando eu mudaria de ideia

Se o provedor devolvesse códigos de erro detalhados, eu classificaria mais casos como definitivos (por exemplo, "número bloqueou a empresa") e pararia de tentar mais cedo.
