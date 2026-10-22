# Visão do produto e metas

**Objetivo:** dizer em uma página o que o Pulso é, para quem e como vou saber se funcionou.
**Data:** 22/10/2026 · **Status:** vigente
**Relacionados:** [problemas](../01-discovery/07-problemas-priorizados.md) · [requisitos](02-requisitos.md)

## Visão

O Pulso é um mini CRM para pequenas empresas de serviços que perdem cliente por falta de acompanhamento. Ele organiza os leads num funil e manda follow-ups no WhatsApp, com regras claras: só em horário comercial, nunca a mesma mensagem duas vezes, para na hora em que o lead responde e respeita quem pede para sair.

**Para quem:** empresas de até uns 10 funcionários que vendem por orçamento e atendem pelo WhatsApp, como a Casa Nova Reformas do meu cenário.

**Como é diferente de uma planilha ou de um CRM grande:** é pequeno o bastante para uma atendente aprender em uma tarde, e a automação foi desenhada em torno do medo de incomodar o cliente, não em torno de enviar mais mensagens.

## O que o Pulso não promete

- Não fecha venda sozinho nem substitui a conversa da atendente.
- Não garante que o número não seja bloqueado: reduz o risco com limites e horário, mas quem manda mensagem de forma indevida continua responsável por isso.

## Metas de sucesso (hipóteses)

Estes números são hipóteses do cenário. Não medi nada. Num piloto de verdade, eu mediria antes de afirmar qualquer coisa.

| ID | Hipótese | Como mediria |
|---|---|---|
| M1 | Todo lead novo recebe a primeira resposta em até 10 minutos dentro do horário comercial, ou na abertura seguinte | Diferença entre criação do lead e primeira mensagem enviada, no log |
| M2 | Nenhum orçamento enviado fica mais de 48h sem uma ação (mensagem ou tarefa) | Leads em "Orçamento enviado" sem interação nas últimas 48h |
| M3 | Zero mensagens duplicadas e zero mensagens fora do horário | Consulta no log de mensagens |
| M4 | A taxa de resposta ao follow-up é de pelo menos 15% | Respostas dentro de 48h após um follow-up / follow-ups enviados |
| M5 | Mais de 80% dos leads perdidos têm motivo registrado | Leads em Perdido com motivo preenchido |
| M6 | A atendente usa o Pulso todos os dias úteis do piloto | Acessos distintos por dia |

M1, M2, M3 e M5 são medíveis só com o que o sistema registra. M4 depende do comportamento do lead e é a mais incerta. Os 15% são um chute meu.
