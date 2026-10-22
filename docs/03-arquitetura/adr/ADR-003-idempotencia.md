# ADR-003: estratégia de idempotência

**Objetivo:** garantir que a mesma mensagem nunca saia duas vezes.
**Data:** 22/10/2026 · **Status:** aceita
**Relacionados:** [RN-05](../../02-definicao/03-regras-de-negocio.md) · [RSK-02](../../02-definicao/06-riscos.md) · [modos de falha](../05-modos-de-falha.md)

## Contexto

O ciclo da automação pode rodar duas vezes seguidas (n8n repetindo a chamada, duas instâncias, eu rodando manualmente). O dono citou "mandar duas vezes a mesma coisa" como a pior hipótese.

## Alternativas

1. Consultar "já enviei?" antes de enviar. Não resolve duas execuções simultâneas.
2. Lock global do ciclo (advisory lock do Postgres). Funciona, mas serializa tudo e não protege contra repetição em outro momento.
3. **Chave de idempotência única por intenção de envio, mais reserva atômica antes de enviar.**

## Escolha

Duas camadas, ambas no banco:

1. **Criação:** cada intenção vira uma linha em `AutomationJob` com `idempotencyKey = regra : lead : instante-do-ciclo` e restrição `UNIQUE`. A inserção usa `INSERT ... ON CONFLICT DO NOTHING` (`createMany` com `skipDuplicates`). Rodar o ciclo dez vezes cria o mesmo job uma vez só.
2. **Execução:** antes de enviar, o job é reservado com `UPDATE ... SET status = 'SENDING' WHERE id = ? AND status = 'PENDING'`. Só quem conseguir atualizar uma linha envia. Duas execuções concorrentes: uma reserva, a outra vê zero linhas afetadas e segue em frente.

O "instante do ciclo" depende do gatilho: data de criação do lead (boas-vindas), início do ciclo sem resposta (follow-ups) ou entrada na etapa (orçamento). Se o lead responde e depois fica em silêncio de novo, nasce um ciclo novo e a chave muda, então os follow-ups podem voltar a existir, o que é o comportamento correto.

## Caso difícil: travou depois de reservar

Se o processo cair entre a reserva e a resposta do provedor, não sei se a mensagem saiu. Escolhi **não reenviar**: um job em `SENDING` há mais de 10 minutos vira `FAILED` com o motivo "estado incerto" e gera tarefa para a atendente verificar. Prefiro uma mensagem possivelmente não enviada a uma duplicada.

## Motivo

A garantia fica no banco, que é a única peça que todos os processos compartilham. Não dependo de relógio, de memória do processo nem de uma instância única.

## Trade-off

Quando a falha acontece no pior instante, a mensagem pode não sair e depende de uma pessoa. É uma troca consciente: o provedor também não oferece chave de idempotência no envio de texto.

## Quando eu mudaria de ideia

Se o provedor aceitasse uma chave de idempotência própria, eu a repassaria e passaria a reenviar com segurança os jobs em estado incerto.
