# ADR-001: n8n ou fila e jobs em código

**Objetivo:** decidir quem orquestra a automação e onde ficam as regras.
**Data:** 22/10/2026 · **Status:** aceita
**Relacionados:** [ADR-004](ADR-004-agendamento-e-fila.md) · [modos de falha](../05-modos-de-falha.md)

## Contexto

O Pulso precisa, a cada poucos minutos, olhar quais leads estão devidos para uma mensagem, tarefa ou mudança de etapa e executar isso com segurança (sem duplicar, sem violar horário). Quero usar o n8n como agendador, mas as regras de negócio precisam de teste automatizado.

## Alternativas

1. **Tudo no n8n:** cada regra vira um fluxo com nós de banco, condição e envio.
2. **Tudo em código, com fila:** BullMQ (Redis) ou pg-boss (Postgres), com worker próprio.
3. **Híbrido:** as regras e o envio ficam no app (código tipado e testado), e o n8n só dispara o ciclo por agenda e cuida de integrações de borda.

## Escolha

Opção 3. O app expõe `POST /api/automation/tick`, protegido por segredo. O n8n chama esse endpoint a cada 5 minutos. Toda a decisão de negócio (quem está devido, horário, limite, idempotência, retentativa) vive em `src/lib/automation`, em funções que recebem a hora como parâmetro.

## Motivo

- Regra de negócio dentro de nós do n8n não se testa com Vitest e é difícil de revisar num diff.
- Um worker com Redis ou pg-boss pede um processo que fique de pé o tempo todo.
- O ciclo é disparado por um agendador externo (n8n, a cada 5 minutos); onde ele roda não faz parte deste estudo.
- O n8n continua útil: agenda, visibilidade das execuções, retentativa da chamada, e uma porta de entrada alternativa para respostas ([fluxos](../../../automations/README.md)).

## Trade-off

Tenho duas peças para operar (app e n8n). Se o n8n cair, nenhum ciclo roda. Como o estado todo está no banco, quando ele volta o próximo ciclo processa o que atrasou (ver [modos de falha](../05-modos-de-falha.md)).

## Quando eu mudaria de ideia

Se o volume passasse de algumas centenas de mensagens por ciclo, eu moveria o processamento para uma fila com worker (pg-boss, para não adicionar Redis). Se a equipe que mantém o sistema não souber n8n, trocaria o agendador por um cron simples, já que o endpoint não depende dele.
