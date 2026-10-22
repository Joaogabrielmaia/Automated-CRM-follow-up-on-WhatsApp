# Wireframes

**Objetivo:** desenhar as quatro telas principais antes de codar, para validar o fluxo.
**Data:** 22/10/2026 · **Status:** validados (ver [registro](02-validacao-do-prototipo.md))
**Relacionados:** [histórias](../02-definicao/04-historias-de-usuario.md) · [rastreabilidade](../02-definicao/07-rastreabilidade.md)

Desenhei em texto para versionar junto do código. A navegação lateral é a mesma em todas as telas: Hoje, Funil, Painel, Modelos, Regras, Automação, Simulador, Configurações.

## T03 Quadro do funil (`/funil`)

```text
+-----------------------------------------------------------------------------------+
| Pulso      Hoje  [Funil]  Painel  Modelos  Regras  Automação  Simulador  Config   |
+-----------------------------------------------------------------------------------+
| Funil                                              [ Buscar lead... ]  [+ Novo lead]|
|                                                                                   |
| Novo (4)        Contatado (6)     Orçamento enviado (5)  Negociação (3)  Ganho  Perdido
| +------------+  +------------+    +------------------+   +-----------+                |
| | Renata M.  |  | Paulo A.   |    | Sônia R.         |   | ...       |                |
| | Banheiro   |  | Pintura    |    | Cozinha          |   +-----------+                |
| | Instagram  |  | Indicação  |    | R$ 18.500        |                                |
| | sem resp.  |  | R$ 3.200   |    | há 3 dias  [!]   |   [!] = sem resposta           |
| | [Mover v]  |  | [Mover v]  |    | [Mover v]        |                                |
| +------------+  +------------+    +------------------+                                |
+-----------------------------------------------------------------------------------+
```

Decisões: cada cartão mostra nome, interesse, origem, valor e um selo quando está sem resposta ou pausado. "Mover" é um seletor e não arrastar, para funcionar bem no celular e no teclado. No mobile, as colunas viram uma lista com abas por etapa.

## T04 Detalhe do lead (`/leads/[id]`)

```text
+-----------------------------------------------------------------------------------+
| < Funil     Renata Marques                     Etapa: [Orçamento enviado v]       |
|             (31) 90000-0101 · Instagram · Banheiro · R$ 12.400 · Resp.: Camila    |
|             [Pausar automação]   [Editar]   Selo: SEM RESPOSTA HÁ 2 DIAS          |
+-----------------------------------+-----------------------------------------------+
| Linha do tempo                    | Tarefas                                       |
|                                   | [ ] Ligar para Renata - 24/10 10:00           |
| 20/10 09:05  Enviado (auto)       | [+ Nova tarefa]                               |
|   "Oi, Renata! Aqui é a Camila…"  |                                               |
| 20/10 09:00  Etapa: Novo -> Cont. | Próximo passo da automação                    |
| 19/10 18:30  Lead criado          |   Follow-up 1 em 21/10 09:05                  |
|                                   |                                               |
| [ Registrar nota ........... ]    | Opt-out: não                                  |
+-----------------------------------+-----------------------------------------------+
```

Decisões: o bloco "próximo passo da automação" responde à pergunta da atendente "o que o sistema vai fazer com esse cliente?". No celular as duas colunas empilham, com ações grandes no topo para o mestre de obras.

## T07 Editor de regras (`/regras`)

```text
+-----------------------------------------------------------------------------------+
| Regras de automação                                         [+ Nova regra]        |
|                                                                                   |
| (•) Ativa  Boas-vindas ao lead novo                                               |
|     Quando: lead novo      Depois de: 5 min     Ação: enviar mensagem             |
|     Modelo: Boas-vindas  [pré-visualizar]                          [Editar]       |
|                                                                                   |
| (•) Ativa  Follow-up 1                                                            |
|     Quando: sem resposta   Depois de: 24 h     Ação: enviar mensagem              |
|                                                                                   |
| ( ) Inativa  Lembrete de orçamento parado                                         |
|     Quando: orçamento sem retorno  Depois de: 48 h  Ação: criar tarefa            |
|                                                                                   |
| Segurança (vale para todas): horário 08-18 seg-sex, 08-12 sáb · máx. 3 por ciclo  |
+-----------------------------------------------------------------------------------+
```

Decisões: o rodapé deixa visível o que nenhuma regra consegue contornar. Só o Admin edita; a Atendente vê.

## T09 Painel (`/painel`)

```text
+-----------------------------------------------------------------------------------+
| Painel                                              Último ciclo: há 3 min        |
| +----------+ +----------+ +----------+ +----------+                               |
| | Abertos  | | Sem resp.| | Enviadas | | Falhas   |                               |
| |    18    | |    5     | |   31     | |    2     |   (últimos 30 dias)           |
| +----------+ +----------+ +----------+ +----------+                               |
| Leads por etapa            Passagem entre etapas                                  |
| Novo        ████ 4         Novo -> Contatado        85%                           |
| Contatado   ██████ 6       Contatado -> Orçamento   62%                           |
| ...                                                                               |
| Desempenho por origem                                                             |
| Origem       Leads  Ganhos  Conversão  Valor ganho                                |
| Indicação      9      4      44%       R$ 41.200                                  |
+-----------------------------------------------------------------------------------+
```

Decisões: números primeiro, gráfico simples depois. A tabela por origem responde à dor P6 sem precisar de biblioteca de gráficos.
