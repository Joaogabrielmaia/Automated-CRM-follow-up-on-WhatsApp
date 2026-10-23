# Plano de rollout

**Objetivo:** definir em que ordem o Pulso passa a ser usado de verdade, com critérios para avançar ou parar.
**Data:** 23/10/2026 · **Status:** proposta, atualizada em 23/10/2026 depois que as lacunas técnicas da versão anterior foram fechadas no código. Decisões tomadas por mim com o que sei hoje; ajuste conforme o piloto real.
**Relacionados:** [checklist](checklist.md) · [rollback](rollback.md) · [treinamento](treinamento.md) · [riscos](../02-definicao/06-riscos.md)

## A decisão principal

**O Pulso começa avisando a atendente, não falando com o lead.** Nas duas primeiras fases nenhuma mensagem automática sai para cliente. As regras criam **tarefas** ("Responder Ana", "Cobrar orçamento") e a atendente manda a mensagem pelo WhatsApp dela, como hoje.

Por quê:

1. **O envio real não foi validado.** O código da API oficial existe (envio de texto e de modelo aprovado, e recebimento de respostas) e está coberto por testes com a rede simulada, mas **nunca falou com a Meta de verdade**. A Meta ainda exige conta verificada, número dedicado e modelos aprovados, e isso só se resolve na conta, não no código.
2. **O envio simulado engana.** Com `MESSAGE_PROVIDER=simulated`, uma regra de mensagem registra "enviada" na linha do tempo do lead sem sair nada. Num piloto real isso seria pior que não ter automação. Por isso, **nas fases 1 e 2 toda regra do tipo "Enviar mensagem" fica desligada.**
3. **O maior valor está no lembrete.** O problema do cenário é o lead esfriar porque ninguém lembra de voltar a falar com ele (P1). Tarefa no dia certo resolve isso sem risco de bloqueio do número.
4. **A RN-16 já previa isso:** "assim o dono pode começar só com lembretes".

## Fases

### Fase 0: preparação (1 a 2 dias)

- Deploy e conferências do [checklist](checklist.md). Dados iniciais com `npm run db:seed:pilot` (etapas, modelos e regras, todas desligadas) e contas reais com `npm run user:create`. Nada de `db:seed`.
- Importar os leads atuais da planilha em *Funil → Importar CSV* (até 500 por arquivo). Eles entram com a automação **pausada**, para a regra de "lead novo" não tratar lead antigo como se tivesse acabado de chegar.
- [Treinamento](treinamento.md) da Camila e do Marcos.
- Todas as regras vêm desligadas do seed de piloto. As de nome **[Fase 1]** criam tarefas; as **[Fase 3]** enviam mensagens e não se mexe nelas ainda.

### Fase 1: funil e lembretes (semanas 1 e 2)

Liga-se **uma regra por vez**, com um dia de intervalo, nesta ordem (já existem no seed de piloto, desligadas):

| Ordem | Regra | Gatilho e atraso | Ação |
|---|---|---|---|
| 1 | [Fase 1] Responder lead novo | Lead novo, 5 min | Criar tarefa "Responder {nome}" |
| 2 | [Fase 1] Cobrar orçamento | Orçamento sem retorno, 48 h | Criar tarefa "Cobrar retorno de {nome}" |
| 3 | [Fase 1] Retomar contato | Sem resposta, 24 h | Criar tarefa "Retomar contato com {nome}" |

Observações:

- A regra 3 só enxerga leads com ciclo iniciado. O ciclo começa quando a atendente usa *Registrar contato feito fora do sistema* no lead. Esse passo é parte do treinamento: sem ele, não há lembrete de "sem resposta".
- A regra "[Fase 3] Perdido sem resposta (120h)" fica **desligada**. Mover lead para Perdido sem uma pessoa decidir é uma escolha de negócio que prefiro adiar.
- Ao ligar uma regra, ela só vale para o que começar depois (RN-17). Os leads antigos não geram tarefa.
- Desligar uma regra cancela na hora o que ela tinha na fila (RN-19), então voltar atrás é seguro.

**Critérios para passar para a fase 2** (todos):

- 2 semanas de uso, com a Camila abrindo o *Hoje* em todos os dias úteis.
- Nenhum erro inesperado (página de erro) nem tarefa duplicada.
- Pelo menos um lead real passou por "orçamento enviado" e gerou o lembrete no prazo.
- A Camila e o Marcos dizem que os lembretes ajudam (conversa de 15 minutos, anotada na [retrospectiva](../07-pos-go-live/retrospectiva.md)).

### Fase 2: pré-requisitos do envio real (sem prazo fixo)

Nada vai para o ar nesta fase. O que era código já está feito; o que falta é conta e validação com a Meta, e só termina quando **todos** os itens abertos estiverem prontos:

**Já feito no código (23/10/2026)**

- [x] Envio de modelo aprovado: campo "Nome do modelo aprovado na Meta" em *Modelos*; as variáveis viram parâmetros (RSK-08).
- [x] Recebimento de respostas pela Meta direto no app (`/api/webhooks/whatsapp-cloud`), sem n8n público.
- [x] Desativar regra cancela a fila (RN-19).
- [x] CI com tipos, lint, testes e E2E (`.github/workflows/ci.yml`); falta só o repositório estar no GitHub.

**Em aberto (dependem de conta, de você ou da Meta)**

- [ ] Conta WhatsApp Business verificada e número dedicado (não o WhatsApp pessoal do Marcos).
- [ ] Modelos de mensagem **submetidos e aprovados pela Meta** (a aprovação pode recusar o texto).
- [ ] Provedor `whatsapp-cloud` e webhook testados na conta de teste da Meta, com o resultado anotado (hoje só foram testados com payloads montados por mim).
- [ ] Webhook da Meta cadastrado e verificado (ver [deploy](deploy.md#api-oficial-do-whatsapp-fase-3)).
- [ ] Revisão jurídica da base legal e do texto de aviso (a minha leitura da LGPD não é parecer).

### Fase 3: envio real, em pequeno (semanas seguintes)

- `MESSAGE_PROVIDER=whatsapp-cloud`.
- Desligar as regras [Fase 1] equivalentes à que for passar a enviar mensagem, para não duplicar o aviso. Começar com **"[Fase 3] Boas-vindas" apenas**, para os leads novos de uma semana. Depois, o follow-up 1. Depois, o follow-up 2.
- Antes de cada regra nova: a Camila lê 10 mensagens reais enviadas pela regra anterior.
- Manter as regras de tarefa ligadas em paralelo.

**Critérios para parar e voltar** (qualquer um): ver [rollback](rollback.md). Resumo: mensagem duplicada, mensagem fora do horário, mensagem para quem pediu SAIR, ou número restrito pela Meta. Chute inicial de alerta: se mais de 1 em cada 10 leads que recebem uma mensagem responder SAIR, pare e reescreva o texto. É um chute, não uma referência.

## Como acompanhar

Metas M1 a M6 de [visão e metas](../02-definicao/01-visao-e-metas.md). Na fase 1, medem-se sem envio real: M2 (nenhum orçamento sem ação em 48 h, agora por tarefa), M5 (motivo de perda registrado) e M6 (uso diário). M1, M3 e M4 só fazem sentido na fase 3.

## O que ainda não decidi

- Quem é o "dono" da operação diária (Marcos ou a Camila) quando algo falhar. Sugiro a Camila para o dia a dia e o Marcos para decidir pausar.
- Se haverá cobrança do Pulso. Fora do escopo deste plano.
