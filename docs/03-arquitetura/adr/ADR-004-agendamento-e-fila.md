# ADR-004: agendamento e fila fora do horário

**Objetivo:** decidir como as mensagens esperam a janela comercial.
**Data:** 22/10/2026 · **Status:** aceita
**Relacionados:** [RN-01, RN-02](../../02-definicao/03-regras-de-negocio.md) · [ADR-001](ADR-001-n8n-ou-jobs-em-codigo.md)

## Contexto

O cliente-tipo achou golpe uma mensagem das 23h, e o dono não quer mensagem de madrugada. Mas lead novo às 21h deve receber resposta quando o expediente abrir, não ser esquecido.

## Alternativas

1. Descartar o que cai fora do horário. Perde o contato.
2. Cada ciclo reavalia tudo sem guardar nada. Fica difícil mostrar "o que está na fila".
3. **Gravar o job com `scheduledFor` já ajustado para a próxima janela, e reconferir na hora de enviar.**

## Escolha

Opção 3. `nextSendableTime(date, config)` é uma função pura: se a data cai dentro da janela, devolve a própria data; senão devolve o início da próxima janela. O job é criado com esse horário. O ciclo só processa jobs com `scheduledFor <= agora`. Na hora de enviar, a janela é conferida de novo (a configuração pode ter mudado, ou o ciclo pode ter atrasado), e se estiver fechada o job volta para `PENDING` com novo horário e um registro no log.

O fuso é fixo em America/Sao_Paulo, UTC−3, sem horário de verão (extinto no Brasil em 2019). Isso me poupa de uma biblioteca de datas e é testável com datas fixas.

## Motivo

A fila fica visível no banco e na tela do log. A dupla conferência (criar e enviar) evita que uma mudança de configuração ou um atraso do n8n quebre RN-01.

## Trade-off

Fuso fixo serve a uma empresa só. Segunda-feira de manhã, as mensagens acumuladas do fim de semana saem todas na abertura. Para poucas dezenas de leads isso é aceitável; com volume, eu espalharia o envio (jitter).

## Quando eu mudaria de ideia

Ao suportar multiempresa em fusos diferentes, eu guardaria o fuso por empresa e usaria `Intl`/Temporal com nome de fuso. Se o governo voltasse com horário de verão, idem.
