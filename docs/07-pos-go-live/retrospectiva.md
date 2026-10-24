# Retrospectiva

**Objetivo:** registrar o que funcionou e o que deu errado na construção do Pulso, com o commit de cada correção.
**Data:** 23/10/2026 · **Status:** fechado
**Relacionados:** [qualidade](../05-qualidade/README.md) · [metas](../02-definicao/01-visao-e-metas.md) · [rollout](../06-go-live/rollout.md) · [riscos](../02-definicao/06-riscos.md) · [ADR-010](../03-arquitetura/adr/ADR-010-sem-loading-tsx.md)

Não houve usuário real nem piloto. As metas M1 a M6 continuam sem medida, e o adaptador da WhatsApp Cloud API nunca falou com a Meta. O que está aqui vem do histórico do git e dos documentos do projeto.

## O que funcionou

1. **Regras puras com o relógio como parâmetro.** Cenários como "24 horas depois, quinta-feira, fora do horário" viram teste sem esperar nada. Foi a decisão de arquitetura que mais se pagou.
2. **Restrição única no banco como garantia de idempotência.** O teste de integração com dois ciclos simultâneos envia a mensagem uma vez só ([ADR-003](../03-arquitetura/adr/ADR-003-idempotencia.md)).
3. **ADRs com o "porquê".** Quando a realidade mudou (webhook nativo da Meta, fim do `loading.tsx`), o ADR ganhou revisão ou um irmão novo em vez de ficar desatualizado.
4. **Medir antes de culpar.** No travamento das ações, a primeira hipótese (prefetch dos links) estava errada. Repetir a ação dezenas de vezes e comparar variantes apontou o `loading.tsx` ([ADR-010](../03-arquitetura/adr/ADR-010-sem-loading-tsx.md), tabela do autor).
5. **Conferir se os testes pegam erro.** Relato do autor, sem log arquivado: quebrei de propósito o intervalo mínimo (RN-18) e uma permissão, e os testes falharam.

## O que deu errado

| O quê | Como apareceu | Correção |
|---|---|---|
| Desativar uma regra não cancelava a fila dela | Preparo do go-live | RN-19, teste de integração (`d654fab`) |
| Não havia como criar um usuário real | Preparo do go-live | `npm run user:create` (`351c855`) |
| O log "Atrasado", prometido em [modos de falha](../03-arquitetura/05-modos-de-falha.md), não existia no código | Preparo do go-live | Evento "Atrasado" no motor (`d654fab`) |
| O seed criava contas e etapas diferentes das da tela de login e dos docs | Ao escrever o E2E | Seed alinhado (`280f792`) |
| `loading.tsx` deixava ações em "Salvando…" ou sem atualizar a tela, só no build de produção | E2E contra `next start` | Arquivo removido (`1cb4fd7`, [ADR-010](../03-arquitetura/adr/ADR-010-sem-loading-tsx.md)) |
| A matriz de rastreabilidade citava arquivos de teste que não existiam | Conferência da matriz | Matriz refeita a partir dos arquivos existentes (`36beb66`) |

O E2E passava contra `next dev` e falhava contra o build de produção. O modo dev é mais lento e não reproduz a mesma corrida entre hidratação, fronteira de Suspense e revalidação.

## O que continua aberto

| Item | Onde está |
|---|---|
| Teste do adaptador da Meta na sandbox: envio, modelo aprovado e webhook | [rollout](../06-go-live/rollout.md), Fase 2 |
| Agendamento do n8n por horas e monitor em `/api/health?strict=1` | [n8n](../06-go-live/n8n.md) · [runbook](runbook.md) |
| Ensaio de rollback e do runbook | [rollback](../06-go-live/rollback.md) |
| Treinamento nunca aplicado | [treinamento](../06-go-live/treinamento.md) |
| Teste automático de "O que fazer hoje a dois cliques" (RNF-05), acessibilidade e mais de um navegador | [qualidade](../05-qualidade/README.md) |
| Recuperação de senha e limite de tentativas de login | [ADR-008](../03-arquitetura/adr/ADR-008-autenticacao.md) |

Por isso o [rollout](../06-go-live/rollout.md) começa **sem envio**: nas duas primeiras fases, só lembretes para a atendente.

## Riscos: o que mudou

- **RSK-02 (duplicidade) e RSK-03 (mensagem após resposta):** cobertos por teste automatizado, incluindo concorrência.
- **RSK-04 (n8n parado sem ninguém perceber):** há o evento "Atrasado", o campo `automation` no health e o modo `?strict=1` para um monitor. Falta cadastrar o monitor.
- **RSK-08 (modelos aprovados da Meta):** o código suporta modelo aprovado. O risco segue alto até a Meta aprovar os textos e eu testar de verdade.

## O que eu faria diferente

1. Rodar o E2E contra o build de produção desde o início. O defeito do `loading.tsx` teria aparecido antes.
2. Escrever a matriz de rastreabilidade a partir do que existe, ou gerá-la.
3. Criar a CI e o remoto no começo.
4. Começar o go-live por uma lista de "o que quebra no mundo real", antes dos guias. As lacunas de desativar regra, usuário real, modelo da Meta e webhook nativo só apareceram ao descrever o go-live passo a passo.
5. Testar o adaptador na sandbox da Meta mais cedo: a exigência de modelos aprovados muda o produto, não só a integração.

← [Runbook](runbook.md) · [Índice](../INDEX.md) · Fim da série
