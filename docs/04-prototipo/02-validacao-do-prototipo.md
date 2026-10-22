# Registro de validação do protótipo

**Objetivo:** anotar o que mudou nos wireframes depois de passar por cada persona, e o que fiz com cada pedido.
**Data:** 22/10/2026 · **Status:** fechado
**Relacionados:** [wireframes](01-wireframes.md) · [escopo](../02-definicao/05-escopo-e-backlog.md)

> Esta validação é simulada, como os [registros de discovery](../01-discovery/03-registro-dono.md). Mostrei os wireframes a uma IA no papel de cada persona (dono, atendente e mestre de obras) e anotei os pedidos. Não houve usuário real olhando.

| # | Quem pediu | Pedido | Decisão | Motivo e impacto no escopo |
|---|---|---|---|---|
| 1 | Dono | Arrastar e soltar os cartões no quadro | **Adiada** | O seletor "Mover" funciona no celular e no teclado, e entrega a mesma coisa. Vai para o roadmap (Could). Sem impacto no MVP |
| 2 | Dono | O sistema responder sozinho às dúvidas do lead (chatbot) | **Recusada** | É justamente o que ele e a atendente disseram temer: uma resposta errada saindo em nome da empresa. Exigiria IA, avaliação de qualidade e novos limites. Fica em "Fora do escopo" |
| 3 | Dono | Mandar uma mensagem "só desta vez" às 22h para um lead importante | **Recusada** | Quebra RN-01, a regra que ele mesmo pediu. Alternativa que ofereci: criar uma tarefa para a atendente ligar de manhã |
| 4 | Atendente | Ver a mensagem pronta antes de ela sair | **Aceita, em parte** | Entra a pré-visualização do modelo com dados de um lead. A aprovação mensagem a mensagem foi recusada: derrota o objetivo de não depender dela. Quem quiser mais controle usa a ação "criar tarefa" no lugar de "enviar" |
| 5 | Atendente | Botão para pausar a automação de um cliente | **Aceita** | Vira RF-12 e RN-10. Entra na Sprint 2 |
| 6 | Atendente | Ver "o que o sistema vai fazer com esse cliente" | **Aceita** | Bloco "próximo passo da automação" no detalhe do lead. Pequeno, calculado a partir dos jobs pendentes |
| 7 | Mestre de obras | Ações grandes no celular e leitura simples da visita | **Aceita** | Detalhe do lead empilhado no mobile, botões com área de toque maior. Vira critério do teste E2E mobile |
| 8 | Dono | Painel com previsão de receita | **Adiada** | A soma do valor estimado por etapa já responde 80% do que ele quer com dados que existem. Previsão probabilística pede histórico que o piloto ainda não tem |
| 9 | Atendente | Alertar por WhatsApp quando um lead responde | **Adiada** | O alerta dentro do sistema (tarefa "Responder" em Hoje) basta para o piloto. Notificação externa vai para v1.x |
| 10 | Dono | Poder escolher, regra por regra, só lembrar a atendente em vez de enviar | **Aceita** | Ação "criar tarefa" (RN-16). Reaproveita o motor, sem custo extra |

## O que mudou nos wireframes

- Detalhe do lead ganhou "próximo passo da automação" e o botão "Pausar automação".
- Editor de regras ganhou o seletor de ação (enviar, criar tarefa, mover para perdido) e a pré-visualização do modelo.
- Quadro: selo de "sem resposta" e de "pausado" nos cartões.

## Impacto no escopo

Cinco pedidos entraram sem custo relevante (4 em parte, 5, 6, 7 e 10), três foram adiados para o roadmap (1, 8 e 9) e dois foram recusados com motivo (2 e 3). O MVP não cresceu.
