# Plano de rollout

**Objetivo:** definir em que ordem o Pulso passa a ser usado de verdade, com critérios para avançar ou parar.
**Data:** 23/10/2026 · **Status:** proposta. Decisões tomadas por mim com o que sei hoje; ajuste conforme o piloto real.
**Relacionados:** [checklist](checklist.md) · [rollback](rollback.md) · [treinamento](treinamento.md) · [riscos](../02-definicao/06-riscos.md)

## A decisão principal

**O Pulso começa avisando a atendente, não falando com o lead.** Nas duas primeiras fases nenhuma mensagem automática sai para cliente. As regras criam **tarefas** ("Responder Ana", "Cobrar orçamento") e a atendente manda a mensagem pelo WhatsApp dela, como hoje.

Por quê:

1. **O envio real não está pronto.** O adaptador da API oficial nunca foi testado contra a Meta, a API exige modelos aprovados para a primeira mensagem e não existe fluxo para receber as respostas (ver [n8n](n8n.md)). Ligar o envio agora produziria falhas.
2. **O envio simulado engana.** Com `MESSAGE_PROVIDER=simulated`, uma regra de mensagem registra "enviada" na linha do tempo do lead sem sair nada. Num piloto real isso seria pior que não ter automação. Por isso, **nas fases 1 e 2 toda regra do tipo "Enviar mensagem" fica desligada.**
3. **O maior valor está no lembrete.** O problema do cenário é o lead esfriar porque ninguém lembra de voltar a falar com ele (P1). Tarefa no dia certo resolve isso sem risco de bloqueio do número.
4. **A RN-16 já previa isso:** "assim o dono pode começar só com lembretes".

## Fases

### Fase 0: preparação (1 a 2 dias)

- Deploy e conferências do [checklist](checklist.md), com contas reais criadas por `npm run user:create` (sem o seed).
- Importar os leads atuais da planilha. **Não há importação em lote**: para um piloto pequeno, cadastrar à mão os leads em aberto (poucas dezenas). Importação CSV vira item do roadmap.
- [Treinamento](treinamento.md) da Camila e do Marcos.
- Regras de mensagem desligadas; só as de tarefa (fase 1) prontas, ainda desligadas.

### Fase 1: funil e lembretes (semanas 1 e 2)

Liga-se **uma regra por vez**, com um dia de intervalo, nesta ordem:

| Ordem | Regra | Gatilho e atraso | Ação |
|---|---|---|---|
| 1 | Responder lead novo | Lead novo, 5 min | Criar tarefa "Responder {nome}" |
| 2 | Cobrar orçamento | Orçamento sem retorno, 48 h | Criar tarefa "Cobrar retorno de {nome}" |
| 3 | Retomar contato | Sem resposta, 24 h | Criar tarefa "Retomar contato com {nome}" |

Observações:

- A regra 3 só enxerga leads com ciclo iniciado. O ciclo começa quando a atendente usa *Registrar contato feito fora do sistema* no lead. Esse passo é parte do treinamento: sem ele, não há lembrete de "sem resposta".
- A regra "Mover para Perdido após 120 h" fica **desligada**. Mover lead para Perdido sem uma pessoa decidir é uma escolha de negócio que prefiro adiar.
- Ao ligar uma regra, ela só vale para o que começar depois (RN-17). Os leads antigos não geram tarefa.

**Critérios para passar para a fase 2** (todos):

- 2 semanas de uso, com a Camila abrindo o *Hoje* em todos os dias úteis.
- Nenhum erro inesperado (página de erro) nem tarefa duplicada.
- Pelo menos um lead real passou por "orçamento enviado" e gerou o lembrete no prazo.
- A Camila e o Marcos dizem que os lembretes ajudam (conversa de 15 minutos, anotada na [retrospectiva](../07-pos-go-live/retrospectiva.md)).

### Fase 2: pré-requisitos do envio real (sem prazo fixo)

Nada vai para o ar nesta fase. É trabalho técnico e de conta, e só termina quando **todos** estes itens estiverem prontos:

- [ ] Conta WhatsApp Business verificada e número dedicado (não o WhatsApp pessoal do Marcos).
- [ ] Modelos de mensagem **aprovados pela Meta** e o provedor adaptado para enviá-los fora da janela de 24 h (RSK-08).
- [ ] Provedor `whatsapp-cloud` testado na conta de teste da Meta, com teste automatizado do adaptador.
- [ ] Fluxo 2 do n8n (respostas) construído, em n8n com endereço público e HTTPS.
- [ ] Correção da desativação de regra, para ela cancelar a fila (ver [rollback](rollback.md)).
- [ ] CI rodando os testes a cada push.
- [ ] Revisão jurídica da base legal e do texto de aviso (a minha leitura da LGPD não é parecer).

### Fase 3: envio real, em pequeno (semanas seguintes)

- `MESSAGE_PROVIDER=whatsapp-cloud`.
- Começar com **a regra de boas-vindas apenas**, para os leads novos de uma semana. Depois, o follow-up 1. Depois, o follow-up 2.
- Antes de cada regra nova: a Camila lê 10 mensagens reais enviadas pela regra anterior.
- Manter as regras de tarefa ligadas em paralelo.

**Critérios para parar e voltar** (qualquer um): ver [rollback](rollback.md). Resumo: mensagem duplicada, mensagem fora do horário, mensagem para quem pediu SAIR, ou número restrito pela Meta. Chute inicial de alerta: se mais de 1 em cada 10 leads que recebem uma mensagem responder SAIR, pare e reescreva o texto. É um chute, não uma referência.

## Como acompanhar

Metas M1 a M6 de [visão e metas](../02-definicao/01-visao-e-metas.md). Na fase 1, medem-se sem envio real: M2 (nenhum orçamento sem ação em 48 h, agora por tarefa), M5 (motivo de perda registrado) e M6 (uso diário). M1, M3 e M4 só fazem sentido na fase 3.

## O que ainda não decidi

- Quem é o "dono" da operação diária (Marcos ou a Camila) quando algo falhar. Sugiro a Camila para o dia a dia e o Marcos para decidir pausar.
- Se haverá cobrança do Pulso. Fora do escopo deste plano.
