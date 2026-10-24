# Galeria

Os 11 prints do app rodando com os dados de demonstração, na ordem do fluxo: entrar, ver o dia, mover o lead, configurar a automação, simular uma resposta, medir e configurar. Cada legenda tem duas partes: o que se vê · por que importa.

← [Índice](../INDEX.md)

## 1. Login

![Tela de login do Pulso: título, subtítulo "Funil de leads e follow-up no WhatsApp", campos E-mail e Senha e botão Entrar](01-login.png)

Formulário de e-mail e senha, sem outras opções · o acesso tem dois papéis, Admin e Atendente, checados no servidor ([ADR-008](../03-arquitetura/adr/ADR-008-autenticacao.md)).

## 2. Hoje

![Tela "O que fazer hoje" com duas tarefas para hoje, um lead sem resposta (Carla Mendes) e o menu lateral](02-hoje.png)

Duas tarefas do dia, uma delas "Responder Bruno" marcada como criada pela automação, e a lista "Sem resposta" · a atendente vê o que fazer sem abrir o funil; a tarefa "Responder" nasce quando o lead escreve (RN-04, RNF-05).

## 3. Funil

![Quadro do funil com as colunas Novo (3 leads), Contatado (1), Orçamento enviado (1) e Negociação (vazia), busca, botões Importar CSV e Novo lead](03-funil.png)

As quatro primeiras colunas do quadro; Ganho e Perdido ficam à direita, fora do print. Os cartões trazem os selos "Pediu para sair" e "Sem resposta agora" e um seletor com botão Mover · as etapas são configuráveis ([ADR-006](../03-arquitetura/adr/ADR-006-etapas-configuraveis.md)) e mover pelo seletor foi a alternativa ao arrastar e soltar ([validação do protótipo](../04-prototipo/02-validacao-do-prototipo.md), pedido 1).

## 4. Lead

![Detalhe do lead Carla Mendes com linha do tempo, bloco "Próximo passo da automação" com três previsões, tarefas, registro de contato fora do sistema e nota](04-lead.png)

Linha do tempo com duas notas e a criação do lead; ao lado, follow-up 1 (24h), follow-up 2 (72h) e Perdido sem resposta (120h) com data prevista; botão Pausar automação · a pessoa vê o que o sistema vai fazer antes de ele fazer (pedidos 5 e 6 da [validação](../04-prototipo/02-validacao-do-prototipo.md), RF-12, RN-10).

## 5. Regras

![Lista de regras de automação, todas com selo Ativa: Boas-vindas, Follow-up 1, Follow-up 2, Perdido sem resposta, Orçamento sem retorno e Lembrete de orçamento para a atendente, e o formulário Nova regra](06-regras.png)

Cada regra mostra gatilho, espera, ação e o texto do modelo; o rodapé lista os limites que valem para todas (horário comercial, no máximo 3 mensagens, 12 h de intervalo) · são as quatro garantias configuráveis; a ação pode ser enviar, criar tarefa ou mover para Perdido (RN-07, RN-16, RN-17).

## 6. Modelos

![Lista de modelos de mensagem com campos Nome e Texto, campo opcional de nome do modelo aprovado na Meta e pré-visualização com a Renata](07-modelos.png)

Quatro modelos com variáveis `{nome}`, `{servico}` e `{valor}` e a pré-visualização preenchida com uma lead de exemplo · se faltar o dado de uma variável a mensagem é pulada, não sai com chaves soltas (RN-14); o campo da Meta é para o modelo aprovado ([RSK-08](../02-definicao/06-riscos.md)).

## 7. Log da automação

![Log da automação com botão Rodar ciclo agora, fila vazia e histórico com os eventos "Pediu para sair" (Fábio Teixeira) e "Lead respondeu" (Bruno Lima)](08-automacao.png)

Fila vazia e dois eventos no histórico, com filtro por tipo · responde "por que saiu ou não saiu"; resposta e opt-out aparecem com o efeito (RN-03, RN-04) e o botão roda um ciclo sem esperar o n8n ([modos de falha](../03-arquitetura/05-modos-de-falha.md)).

## 8. Simulador

![Simulador de lead com seletor do lead, caixa de mensagem com "Oi! Pode ser amanhã de manhã?" e botão Enviar resposta do lead](09-simulador.png)

Escolha do lead e texto da resposta, com a dica de testar "SAIR" · a resposta entra pelo mesmo caminho do webhook, então dá para demonstrar a parada da fila sem WhatsApp real (RF-17).

## 9. Painel

![Painel com quatro totais (5 leads em aberto, 1 sem resposta, 0 mensagens enviadas e 0 falhas em 30 dias), leads por etapa, passagem entre etapas, desempenho por origem e motivos de perda](05-painel.png)

Totais, leads por etapa com valor, taxa de passagem entre etapas, conversão por origem e motivos de perda · as metas M1, M2, M3 e M5 saem do que o sistema já registra ([visão e metas](../02-definicao/01-visao-e-metas.md)).

## 10. Configurações

![Configurações com as seis etapas do funil e seus tipos à esquerda, e horário comercial por dia da semana e limites à direita](10-configuracoes.png)

Etapas com tipo (aberta, orçamento, ganha, perdida), horários de segunda a sábado, máximo de 3 mensagens por lead e intervalo de 12 horas; abaixo, "Provedor de envio: simulado" · são os valores padrão de RN-01, RN-06 e RN-18, editáveis só pelo Admin.

## 11. Importar CSV

![Tela Importar leads da planilha com campo de arquivo, opção marcada de começar com a automação pausada e exemplo do formato do arquivo](11-importar-csv.png)

Arquivo CSV com nome e telefone obrigatórios; a opção de começar com a automação pausada vem marcada · a migração da planilha não dispara "lead novo" para quem já era cliente antigo (RF-20, [testes de importação](../../tests/integration/import.test.ts)).
