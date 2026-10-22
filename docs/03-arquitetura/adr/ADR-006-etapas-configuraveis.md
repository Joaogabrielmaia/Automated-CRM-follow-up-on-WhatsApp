# ADR-006: modelagem de etapas configuráveis

**Objetivo:** permitir que o dono renomeie e reordene etapas sem quebrar a automação.
**Data:** 22/10/2026 · **Status:** aceita
**Relacionados:** [RF-03](../../02-definicao/02-requisitos.md) · [RN-09](../../02-definicao/03-regras-de-negocio.md)

## Contexto

O pedido era etapas configuráveis (Novo, Contatado, Orçamento enviado, Negociação, Ganho, Perdido). As regras, porém, precisam saber o que cada etapa significa: onde o orçamento foi enviado, o que encerra o lead.

## Alternativas

1. Enum fixo no código. Não é configurável.
2. Tabela de etapas só com nome e posição. Configurável, mas a regra "orçamento sem retorno" teria de buscar pelo nome, o que quebra quando alguém renomeia.
3. **Tabela `Stage` com `name`, `position` e `kind` (OPEN, QUOTE, WON, LOST).**

## Escolha

Opção 3. O nome e a posição são livres; o `kind` é o que as regras consultam. Nenhuma regra depende do texto do nome. Exigência de integridade: sempre existe pelo menos uma etapa WON e uma LOST, e uma etapa com leads não pode ser removida.

## Motivo

Mantém a flexibilidade que o dono pediu e a confiabilidade que a automação precisa. Renomear "Orçamento enviado" para "Proposta enviada" não muda o comportamento.

## Trade-off

Um conceito a mais para explicar na tela de configurações (o tipo da etapa). Eu o descrevo com um texto de apoio no próprio formulário.

## Quando eu mudaria de ideia

Se surgissem funis diferentes por tipo de serviço, eu criaria um `Pipeline` pai de `Stage`. Hoje seria complexidade sem ninguém pedindo.
