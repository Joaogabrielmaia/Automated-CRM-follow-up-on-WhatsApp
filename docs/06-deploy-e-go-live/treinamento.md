# Treinamento

**Objetivo:** ensinar a Camila (atendente) e o Marcos (dono) a usar o Pulso em uma tarde, sem manual longo.
**Data:** 23/10/2026 · **Status:** proposta de roteiro, ainda não aplicada com ninguém
**Relacionados:** [rollout](rollout.md) · [personas](../01-discovery/02-negocio-e-personas.md) · [boas práticas](boas-praticas-de-mensagem.md)

## Decisões

- **Presencial ou em chamada, com o app aberto**, não um documento para ler. A meta do produto é "uma atendente aprender em uma tarde".
- **Duas sessões:** Camila, 90 minutos; Marcos, 30 minutos, em outro momento (ele usa o celular entre obras).
- **Treinar no ambiente de demonstração**, com os leads fictícios e o simulador. Só no fim, abrir 3 leads reais.
- **Sem decorar tela.** Cada bloco termina com um exercício que ela faz sozinha.

## Sessão da Camila (90 minutos)

| Min | Bloco | Exercício |
|---|---|---|
| 0–10 | **Para que serve.** O Pulso lembra, não fala por ela (na fase 1). Mostrar *Hoje* | Dizer em voz alta: "o que eu faço primeiro de manhã?" |
| 10–25 | **Cadastrar e achar um lead.** Novo lead, telefone em qualquer formato, origem, interesse, valor. Busca no funil | Cadastrar 2 leads e achar um pelo telefone |
| 25–40 | **Mover no funil.** Mover para outra etapa; para *Perdido* exige motivo; entrar em *Orçamento enviado* começa a contar as 48 h | Levar um lead até orçamento e outro até perdido |
| 40–55 | **Tarefas e *Hoje*.** Tarefa criada pelo sistema vs. criada por ela; concluir | Concluir uma tarefa e criar outra com prazo |
| 55–70 | **Registrar contato feito fora do sistema.** Mandou orçamento pelo WhatsApp? Registrar no lead. É o que liga o "sem resposta" | Registrar um contato e ver a marca "Sem resposta" no quadro |
| 70–80 | **Pausar, nota, SAIR.** Pausar automação de um lead; nota; o que significa "Pediu para sair" (só o Marcos desfaz) | Usar o simulador para o lead responder e depois escrever SAIR |
| 80–90 | **O que fazer quando algo estranho aparecer** e dúvidas | Ler a "colinha" abaixo |

### Colinha da Camila (uma página)

- **Todo dia:** abrir *Hoje*. Atrasadas primeiro, depois as de hoje, depois quem está sem resposta.
- **Falei com o lead fora do Pulso:** abrir o lead → *Registrar contato feito fora do sistema*.
- **Lead respondeu e eu atendi:** concluir a tarefa "Responder".
- **Lead não vai fechar:** mover para *Perdido* e escrever o motivo de verdade (alimenta o painel).
- **Não quero que a automação mexa neste lead:** *Pausar automação*.
- **Lead escreveu SAIR / PARAR / STOP:** está bloqueado; não insistir por conta própria. Quem libera é o Marcos, e só se o lead pedir.
- **Telefone repetido:** o lead já existe; procure pelo número.
- **Algo estranho** (mensagem duplicada, mensagem fora de hora, mensagem quebrada): **avisar o Marcos na hora** e não mexer em nada. Ele sabe como parar.

## Sessão do Marcos (30 minutos)

| Min | Bloco |
|---|---|
| 0–5 | O que o Pulso faz e o que **não** faz (não fecha venda, não garante que o número não seja bloqueado) |
| 5–15 | **Painel:** leads por etapa, passagem entre etapas, sem resposta, desempenho por origem, motivos de perda. O que cada número significa e o que não significa |
| 15–22 | **Regras:** nascem desligadas; ao ligar, só valem para o que começar depois; ligar **uma por vez** (ver [rollout](rollout.md)) |
| 22–27 | **Parar tudo:** onde fica o botão de pânico e o [rollback](rollback.md). Ensaiar uma vez |
| 27–30 | Combinados: quem decide pausar, para quem a Camila liga se estranhar algo |

O Marcos precisa sair da sessão sabendo fazer **uma coisa** sozinho: parar a automação. O resto ele aprende usando.

## Ao final, cada um deve conseguir (teste de saída)

**Camila**, sem ajuda e em 10 minutos: cadastrar um lead, movê-lo até *Orçamento enviado*, registrar um contato fora do sistema, pausar a automação dele, e achar a tarefa "Responder" gerada por uma resposta simulada.

**Marcos**, em 2 minutos: abrir o painel e dizer quantos leads estão sem resposta; desativar o fluxo do n8n e explicar por que isso para tudo.

Quem não conseguir refaz o bloco, não avança para o piloto.

## Depois do treinamento

- **Dia seguinte:** 10 minutos por mensagem com a Camila: "alguma coisa travou?".
- **Fim da primeira semana:** 20 minutos para anotar o que atrapalhou. Isso alimenta a [retrospectiva](../07-pos-go-live/retrospectiva.md).
- Tudo o que ela perguntar mais de uma vez vira ajuste na tela ou na colinha.

## O que o treinamento não cobre

Instalação, banco, n8n e deploy. Isso é com quem opera o sistema (ver [deploy](deploy.md) e [runbook](../07-pos-go-live/runbook.md)).
