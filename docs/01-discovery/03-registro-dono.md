# Registro de discovery do cenário: dono

**Objetivo:** entender metas, volume de leads e quanto se perde, pelo ponto de vista do dono.
**Data:** 22/10/2026 · **Status:** fechado
**Relacionados:** [atendente](04-registro-atendente.md) · [cliente](05-registro-cliente.md) · [problemas](07-problemas-priorizados.md)

> Não é uma reunião que aconteceu. Eu escrevi o roteiro e as perguntas, e simulei as respostas usando uma IA no papel do Marcos, dono da Casa Nova Reformas. Fiz isso porque não tinha um dono real para entrevistar neste projeto. Os números que aparecem nas respostas são do cenário, não medições.

## Roteiro

1. Abrir com o negócio e o último mês, sem falar de sistema.
2. Entender de onde vêm os leads e quanto fecha.
3. Descobrir onde ele acha que perde dinheiro e por quê.
4. Só então falar de automação e testar a reação.

## Perguntas, respostas e por que perguntei

**1. "Me conta o último orçamento que você mandou e o que aconteceu depois."**
*Por quê:* prefiro um caso concreto a uma opinião genérica.
*Resposta:* "Uma reforma de cozinha em apartamento. Mandei o PDF na terça, ela disse 'vou ver com meu marido'. Nunca mais falei com ela. Não sei se fechou com outro."

**2. "Quantos pedidos de contato chegam por mês e quantos viram obra?"**
*Por quê:* preciso de ordem de grandeza para saber se vale automatizar.
*Resposta:* "Uns 60 por mês. Fecha uns 10, 12. Eu acho que se eu corresse atrás de todo mundo fechava uns 5 a mais, mas é chute."
*Anotação:* tratar como hipótese. O chute dele entra como meta a validar, não como fato.

**3. "Quando você diz que perde cliente, em que momento isso acontece?"**
*Por quê:* "perder" é vago. Quero o ponto exato no processo.
*Resposta:* "Depois do orçamento. Antes disso a gente responde rápido, porque o cliente tá quente."

**4. "O que acontece se você não responder um lead novo em duas horas?"**
*Por quê:* testar se o tempo de primeira resposta também dói.
*Resposta:* "Se for fim de semana, ele fica até segunda. Aí já esfriou."

**5. "O que você gostaria que o sistema fizesse?"**
*Resposta:* "Quero que seja tudo automático. Entrou lead, o sistema cuida. Eu não quero nem olhar."
*Anotação:* pedido vago. A pergunta seguinte serve para refinar.

**6. "Se o sistema mandar uma mensagem em seu nome, qual é a pior coisa que poderia acontecer?"**
*Por quê:* transformar "tudo automático" em limites concretos a partir da pior hipótese.
*Resposta:* "Mandar duas vezes a mesma coisa. Ou mandar um 'oi, tudo bem?' pra um cliente que já fechou comigo. Ou de madrugada. Isso me queima."

**7. "Quantas mensagens seguidas, sem resposta, você acha aceitável antes de parar?"**
*Por quê:* definir o limite que depois vira regra.
*Resposta:* "Duas. Três já é chato."

**8. "Que número você usa hoje para atender?"**
*Por quê:* a integração depende disso.
*Resposta:* "O meu pessoal mesmo, o que tá no Instagram. Não quero trocar, os clientes antigos me chamam nele."

## Contradição

O dono quer "tudo automático, nem olhar" (resposta 5), mas o que mais teme é a mensagem errada saindo em seu nome (resposta 6). As duas coisas não cabem juntas sem controles. Resolvi assim: automático **dentro de limites explícitos** (horário comercial, no máximo 2 follow-ups, parar quando o lead responde, opt-out), com um log para ele conferir quando quiser e com a opção de uma regra só **lembrar a atendente** em vez de enviar.

## Restrição que muda o escopo

A API oficial do WhatsApp exige um número dedicado e não aceita o número pessoal em uso no aplicativo comum. Ele não quer trocar de número. Isso muda o escopo de três formas:

1. O envio passa por uma interface de provedor, para eu poder trocar o canal sem mexer nas regras.
2. Toda regra pode ter como ação "enviar mensagem" **ou** "criar tarefa para a atendente". No piloto, o dono pode começar só com lembretes.
3. A demonstração usa um provedor simulado, e a ida para a API oficial fica documentada como passo de implantação.

## Conclusões

- A perda está depois do orçamento, mas o tempo de primeira resposta também importa (P1, P2).
- Limite de 2 follow-ups sem resposta; depois disso o lead vai para Perdido (RN-07).
- Nunca mandar fora do horário comercial (RN-02).
- Nunca mandar duas vezes a mesma mensagem (RN-05).
- Número do dono não muda: provedor plugável.
