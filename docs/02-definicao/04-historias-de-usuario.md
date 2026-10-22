# Histórias de usuário

**Objetivo:** descrever o que cada pessoa quer fazer e como saberei que está pronto.
**Data:** 22/10/2026 · **Status:** vigente
**Relacionados:** [requisitos](02-requisitos.md) · [regras](03-regras-de-negocio.md) · [rastreabilidade](07-rastreabilidade.md)

Formato: *Como [persona], quero [ação], para [benefício]*, com critérios Dado / Quando / Então.

## HU-01 Entrar no sistema (RF-01)
Como atendente ou dono, quero entrar com e-mail e senha, para ver só o que meu papel permite.
- **Dado** um usuário cadastrado, **quando** informa e-mail e senha corretos, **então** vai para "Hoje".
- **Dado** senha errada, **quando** envia, **então** vê uma mensagem genérica de erro, sem dizer se foi o e-mail ou a senha.
- **Dado** um Atendente, **quando** tenta abrir `/regras` para editar, **então** o servidor recusa a alteração.

## HU-02 Cadastrar lead (RF-02, RN-13)
Como atendente, quero cadastrar um lead com os dados do primeiro contato, para não depender da planilha.
- **Dado** o formulário preenchido, **quando** salvo, **então** o lead aparece na etapa "Novo".
- **Dado** um telefone já usado por outro lead ativo, **quando** salvo, **então** vejo o aviso e o cadastro não é duplicado.
- **Dado** um telefone fora do padrão (por exemplo com parênteses e hífen), **quando** salvo, **então** ele é guardado normalizado.

## HU-03 Mover o lead no funil (RF-04, RF-18, RN-09)
Como atendente, quero mover o lead entre etapas, para refletir onde a negociação está.
- **Dado** um lead em "Novo", **quando** movo para "Contatado", **então** o quadro e o histórico refletem a mudança.
- **Dado** que movo para "Perdido", **quando** não informo o motivo, **então** a ação é recusada.
- **Dado** que movo para "Ganho", **quando** havia mensagens pendentes, **então** elas são canceladas.

## HU-04 Configurar etapas (RF-03)
Como dono, quero ajustar as etapas do funil, para refletir como a empresa vende.
- **Dado** a tela de configurações, **quando** renomeio ou reordeno uma etapa, **então** o quadro usa a nova ordem.
- **Dado** uma etapa com leads, **quando** tento removê-la, **então** sou impedido até movê-los.

## HU-05 Histórico e tarefas do lead (RF-05, RF-06)
Como atendente, quero ver tudo que aconteceu com o lead e agendar o próximo passo, para abandonar o caderninho.
- **Dado** um lead, **quando** abro o detalhe, **então** vejo a linha do tempo com mensagens, notas e mudanças de etapa.
- **Dado** uma tarefa com prazo hoje, **quando** abro "Hoje", **então** ela aparece, e as atrasadas aparecem primeiro.

## HU-06 Modelos de mensagem (RF-07, RN-14)
Como atendente, quero editar os textos que o sistema envia, para soarem como eu.
- **Dado** um modelo com `{nome}`, **quando** a mensagem é gerada para "Renata", **então** o texto sai com "Renata".
- **Dado** um modelo com `{valor}` e um lead sem valor, **quando** o sistema vai enviar, **então** pula o envio e registra o motivo.

## HU-07 Criar e ativar regras (RF-08)
Como dono, quero criar e ativar regras de follow-up, para decidir quando o sistema age.
- **Dado** a tela de regras, **quando** crio "sem resposta em 24h" com um modelo, **então** a regra fica salva e inativa até eu ativar.
- **Dado** uma regra ativa, **quando** a desativo, **então** nenhuma mensagem nova é criada por ela.

## HU-08 Boas-vindas (RF-09, RN-12, RN-01, RN-02)
Como lead novo, quero receber uma primeira resposta educada rápido, para saber que fui visto.
- **Dado** a regra ativa e horário comercial, **quando** um lead é criado, **então** ele recebe a mensagem após o atraso configurado.
- **Dado** que o lead foi criado às 21h, **quando** o ciclo roda, **então** a mensagem fica na fila e sai na próxima abertura.

## HU-09 Follow-ups por falta de resposta (RF-10, RN-05, RN-06, RN-07, RN-08)
Como dono, quero que o sistema retome o contato duas vezes e depois desista, para não perder lead nem insistir.
- **Dado** um lead sem resposta há 24h, **quando** o ciclo roda, **então** recebe o follow-up 1, uma única vez, mesmo se o ciclo rodar de novo.
- **Dado** 72h sem resposta, **então** recebe o follow-up 2.
- **Dado** 120h sem resposta, **então** o lead vai para "Perdido" com o motivo "Sem resposta após follow-ups".
- **Dado** que já houve 3 mensagens automáticas no ciclo, **então** nenhuma outra é enviada.

## HU-10 Lead responde e a sequência para (RF-13, RN-04, RNF-09)
Como lead, quero que a empresa pare de me mandar mensagem quando eu respondo, para eu conversar com uma pessoa.
- **Dado** mensagens pendentes, **quando** chega a resposta pelo webhook com assinatura válida, **então** elas são canceladas e a atendente recebe uma tarefa.
- **Dado** uma assinatura inválida, **quando** o webhook é chamado, **então** responde 401 e nada é gravado.
- **Dado** o mesmo evento enviado duas vezes, **então** é processado uma vez.

## HU-11 Sair da lista (RF-14, RN-03)
Como lead, quero responder SAIR e não ser mais chamado.
- **Dado** a resposta "Sair.", **quando** chega ao sistema, **então** o lead fica em opt-out e nada mais é enviado.
- **Dado** um lead em opt-out, **quando** um Atendente tenta reativar, **então** é recusado; um Admin consegue.

## HU-12 Orçamento sem retorno (RF-11, RN-15)
Como atendente, quero ser lembrada de orçamentos parados, para chamar na hora certa.
- **Dado** um lead em "Orçamento enviado" há 48h sem resposta, **quando** o ciclo roda, **então** é criada uma tarefa para o responsável e uma mensagem ao lead.

## HU-13 Pausar um lead (RF-12, RN-10)
Como atendente, quero pausar a automação de um lead, para falar com ele por conta própria.
- **Dado** um lead pausado, **quando** o ciclo roda, **então** nada é criado nem enviado para ele.

## HU-14 Acompanhar o funil (RF-15, RF-16)
Como dono, quero números e o log do que a automação fez, para confiar nela.
- **Dado** o painel, **quando** abro, **então** vejo leads por etapa, passagem entre etapas, sem resposta, mensagens enviadas e falhas, e desempenho por origem.
- **Dado** o log, **quando** filtro por lead, **então** vejo cada decisão com o motivo.

## HU-15 Demonstrar uma resposta (RF-17)
Como pessoa que apresenta o sistema, quero simular uma resposta de lead, para mostrar a sequência parando sem precisar de um WhatsApp real.
- **Dado** o simulador, **quando** escolho um lead e envio "Pode ser amanhã?", **então** o mesmo processamento do webhook roda e a sequência para.

## HU-16 Falha do provedor (RNF-02, RN-11)
Como dono, quero que falhas de envio sejam tentadas de novo e fiquem visíveis, para não perder mensagem em silêncio.
- **Dado** um provedor que falha, **quando** o ciclo roda, **então** a tentativa é reagendada com espera crescente até 3 vezes.
- **Dado** a falha final, **então** a mensagem aparece como falha no log e uma tarefa é criada.
