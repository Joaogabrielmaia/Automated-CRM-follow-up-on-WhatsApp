# Problemas priorizados

**Objetivo:** listar os problemas do cenário com causa raiz, impacto e evidência, na ordem em que vou atacá-los.
**Data:** 22/10/2026 · **Status:** fechado
**Relacionados:** [processo atual](06-processo-atual.md) · [requisitos](../02-definicao/02-requisitos.md)

Baseado em registros simulados; impactos são hipóteses. A evidência aponta para o registro de onde veio a informação.

| ID | Problema | Causa raiz | Impacto (hipótese) | Evidência | Prioridade |
|---|---|---|---|---|---|
| P1 | Orçamento enviado e esquecido | Não há lembrete nem rotina; o controle é um caderninho | Alto: é onde o dono diz perder mais | [dono, perg. 3](03-registro-dono.md), [atendente, perg. 2](04-registro-atendente.md) | 1 |
| P2 | Lead novo espera mais de 2h, principalmente fora do horário | Atendimento depende do dono ver o celular | Alto | [dono, perg. 4](03-registro-dono.md), [cliente, perg. 1](05-registro-cliente.md) | 2 |
| P3 | Medo de a automação irritar o cliente | Ausência de limites (frequência, horário, parada) | Alto, e pode piorar a situação atual | [dono, perg. 6](03-registro-dono.md), [cliente, perg. 3 e 4](05-registro-cliente.md) | 3 (condição para P1 e P2) |
| P4 | Sem visibilidade do que está aberto | Planilha desatualizada, sem etapas | Médio | [atendente, perg. 4](04-registro-atendente.md) | 4 |
| P5 | Motivos de perda não registrados | Não existe campo nem hábito | Médio | [AS-IS, perda 3](06-processo-atual.md) | 5 |
| P6 | Sem origem do lead e sem desempenho por canal | Dados dispersos | Baixo no curto prazo | [dono, perg. 2](03-registro-dono.md) | 6 |

P3 não é um problema a resolver depois dos outros: é uma condição para resolver P1 e P2. Por isso as regras de segurança da automação entram no MVP inteiras.
