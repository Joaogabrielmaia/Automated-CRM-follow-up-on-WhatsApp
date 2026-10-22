# Registro de discovery do cenário: atendente

**Objetivo:** entender o dia a dia da atendente e onde o lead esfria na prática.
**Data:** 22/10/2026 · **Status:** fechado
**Relacionados:** [dono](03-registro-dono.md) · [cliente](05-registro-cliente.md) · [processo atual](06-processo-atual.md)

> Não é uma reunião que aconteceu. Escrevi o roteiro e simulei as respostas com uma IA no papel da Camila, atendente da Casa Nova Reformas. Os números são do cenário.

## Roteiro

1. Pedir que ela descreva um dia comum, hora por hora.
2. Seguir o caminho de um lead do primeiro contato até o orçamento.
3. Procurar onde ela improvisa, esquece ou depende de outra pessoa.
4. Sondar o que ela sente em relação à automação.

## Perguntas, respostas e por que perguntei

**1. "Descreve uma terça-feira normal, desde que você chega."**
*Por quê:* quero ver as interrupções, não a versão ideal.
*Resposta:* "Chego, abro a planilha, vejo se o Marcos deixou algum áudio com informação de visita, respondo os WhatsApps novos, faço orçamento até umas 15h. Se sobra tempo eu vejo quem ficou sem resposta."

**2. "Quanto tempo sobra para olhar quem ficou sem resposta?"**
*Resposta:* "Quase nunca sobra. Eu tenho um caderninho com uns nomes e um 'chamar quinta'. Perco o caderninho de vez em quando."

**3. "Como você decide quem chamar?"**
*Por quê:* descobrir o critério real, que costuma ser implícito.
*Resposta:* "Pelo valor do orçamento e pelo jeito do cliente. Se pareceu interessado, eu chamo com mais cuidado."

**4. "Você consegue me dizer um número: quantos orçamentos estão abertos agora?"**
*Por quê:* teste de visibilidade.
*Resposta:* "Hm... uns 20? Teria que contar na planilha."

**5. "O que você escreve quando chama alguém que sumiu?"**
*Por quê:* conhecer o tom que depois viro modelos de mensagem.
*Resposta:* "'Oi, Renata, tudo bem? Passando pra saber se você conseguiu ver o orçamento da cozinha. Qualquer dúvida, estou por aqui.' Eu não cobro, eu pergunto."

**6. "E como você se sente com o sistema mandando essas mensagens?"**
*Resposta:* "Tenho medo de parecer robô. O cliente sabe quando é copiado e colado. E se ele responder e o sistema mandar outra por cima?"

**7. "O que te daria segurança?"**
*Por quê:* transformar o medo em requisito.
*Resposta:* "Poder ler a mensagem antes. Ver que quando o cliente responde, tudo para. E eu poder pausar um cliente específico."

**8. "Você pediu 'um sistema fácil'. Fácil como?"**
*Por quê:* pedido vago. Pedi um exemplo concreto.
*Resposta:* "Que eu não precise clicar mais de três vezes pra ver quem eu tenho que chamar hoje."

## Contradição

O dono quer tirar a atendente do loop ("nem olhar"). A atendente quer **mais** controle: ler as mensagens, pausar um lead, ver a parada por resposta. Em vez de escolher um lado, tratei como papéis: a atendente edita modelos e pausa leads; o dono (Admin) cria e ativa regras e consulta o log.

## Pedido vago refinado

"Um sistema fácil" virou critério verificável: a lista "O que fazer hoje" (tarefas do dia e leads sem resposta) precisa estar a no máximo **dois cliques** do início (RNF-05).

## Conclusões

- Modelos de mensagem editáveis, com o tom dela (RF-07).
- Parada total quando o lead responde, e botão de pausar por lead (RN-04, RF-12).
- Visibilidade do que está aberto: quadro por etapa e contagem de sem resposta (RF-04, RF-15).
- O caderninho vira tarefa com prazo (RF-06).
