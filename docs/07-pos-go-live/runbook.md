# Runbook de operação

**Objetivo:** dizer a quem opera o Pulso o que olhar todo dia, o que fazer quando algo falha e o que não fazer.
**Data:** 23/10/2026 · **Status:** escrito a partir do código e dos [modos de falha](../03-arquitetura/05-modos-de-falha.md); **nenhum procedimento foi ensaiado em produção**
**Relacionados:** [rollback](../06-deploy-e-go-live/rollback.md) · [n8n](../06-deploy-e-go-live/n8n.md) · [deploy](../06-deploy-e-go-live/deploy.md) · [riscos](../02-definicao/06-riscos.md)

## Papéis

| Quem | Faz |
|---|---|
| Camila (atendente) | Olha *Hoje* todo dia, conclui tarefas, avisa o Marcos de qualquer coisa estranha, **sem mexer** |
| Marcos (dono, Admin) | Decide pausar, para a automação, remove opt-out, olha o painel |
| Quem opera (eu, no piloto) | Banco, Vercel, n8n, segredos, correções |

## Onde olhar

| O que | Onde | O que significa |
|---|---|---|
| App e banco de pé | `GET /api/health` | `status: ok`; `503` = banco inacessível |
| O ciclo está rodando | Painel ("Último ciclo há…"), tela Automação, `lastAutomationRunAt` no health | Deve ter no máximo ~10 minutos (o n8n roda a cada 5) |
| O que a automação decidiu | Tela *Automação*: fila e log, com filtro por evento e por lead | Cada decisão tem evento e motivo |
| Execuções do agendador | n8n → *Executions* | Verde a cada 5 minutos |
| Falhas que pedem uma pessoa | Tela *Hoje* (tarefas "criada pela automação") | "Verificar contato de…", "Conferir se a mensagem para… foi enviada" |

Eventos do log: Criado, Mensagem enviada, Pulado, Cancelado, Reagendado, Nova tentativa agendada, Falha, Fila cancelada, Tarefa criada, Movido para Perdido, Pediu para sair, Lead respondeu, Remetente desconhecido.

Motivos mais comuns: Fora do horário comercial, Intervalo mínimo entre mensagens, Limite de mensagens por ciclo, O lead respondeu, O lead pediu para sair, Automação pausada, Etapa encerrada, Faltou dado do lead, Tentativas esgotadas, Erro definitivo do provedor, Estado incerto.

## Rotina

**Todo dia útil (2 minutos, Camila ou Marcos):** abrir *Hoje* e *Automação*; ver se "Último ciclo" é recente e se há eventos de **Falha**.

**Toda semana (10 minutos, Marcos):** olhar o painel (leads sem resposta, falhas, motivos de perda); ler cinco mensagens enviadas; conferir o backup do banco.

**Todo mês:** rodar `npm audit`; trocar segredos se alguém saiu da equipe; revisar as contas ativas.

## Problemas e o que fazer

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| "Último ciclo" com mais de 15 minutos | n8n parado, fluxo desativado, ou o app responde erro | 1) n8n → *Executions*: há execuções? 2) Se vermelhas, ver a mensagem (401 = segredos diferentes; 5xx = ver `/api/health`). 3) Admin: *Rodar ciclo agora*. Quando o ciclo volta, ele recupera o atraso sozinho, respeitando o horário. Observação: o log **não** marca essas mensagens como "atrasadas" (o documento de modos de falha prevê isso, mas não foi implementado) |
| `/api/health` devolve 503 | Banco do Neon inacessível ou `DATABASE_URL` errada | Abrir o painel do Neon. Se o banco "dormiu", a próxima chamada o acorda; repetir após 30 s. Se foi mudança de variável, voltar o valor e refazer o deploy |
| n8n com 401 no ciclo | `AUTOMATION_SECRET` diferente entre n8n e Vercel | Igualar os dois. O n8n lê do `.env` local ou do `docker-compose.override.yml` |
| n8n com erro de rede/timeout | App fora do ar, ou banco acordando | Ver health. O fluxo tenta 3 vezes sozinho |
| Muitos **Falha** com "Erro definitivo do provedor" | Número do lead inválido (um caso) ou token do WhatsApp inválido (todos) | Um caso: a tarefa "Verificar contato" avisa a Camila. Todos: parar (rollback nível 1) e conferir `WHATSAPP_ACCESS_TOKEN` |
| **Falha** com "Tentativas esgotadas" | Provedor instável durante 4 tentativas | Camila liga/escreve para o lead (tarefa criada). Se afetar vários, parar e conferir o provedor |
| Tarefa "Conferir se a mensagem para X foi enviada" (Estado incerto) | O processo caiu depois de reservar o envio; não dá para saber se saiu | **Não reenviar às cegas.** Conferir no WhatsApp Business ou no painel da Meta se a mensagem existe. Se saiu, concluir a tarefa. Se não saiu, a Camila contata o lead manualmente |
| Mensagens com status *Pulado* e "Faltou dado do lead" | O modelo usa `{servico}` ou `{valor}` e o lead não tem | Preencher o dado no lead, ou trocar o modelo (ver [boas práticas](../06-deploy-e-go-live/boas-praticas-de-mensagem.md)). A mensagem pulada **não** é reenviada depois: o ciclo daquele envio acabou |
| Webhook responde 401 | `WEBHOOK_SECRET` diferente, ou a assinatura foi calculada sobre um texto diferente do enviado | Igualar o segredo. Conferir que o corpo assinado é exatamente o enviado ([n8n](../06-deploy-e-go-live/n8n.md), fluxo 2) |
| Respostas dos leads não aparecem | Fluxo 2 do n8n não existe/está parado, ou número do remetente sem lead | No piloto atual, respostas só entram pelo simulador. Com fluxo 2: ver log por "Remetente desconhecido" |
| Suspeita de mensagem duplicada | — | Parar (rollback 1). Procurar: `SELECT "leadId", body, count(*) FROM "Interaction" WHERE type = 'MESSAGE_OUT' GROUP BY "leadId", body HAVING count(*) > 1;` A chave de idempotência é única no banco, então uma duplicata de verdade seria um defeito grave: guarde o que viu |
| Lead recebeu mensagem depois de pedir SAIR | — | Parar já. Tratar como incidente: [rollback](../06-deploy-e-go-live/rollback.md), seção "Se uma mensagem errada saiu" |
| Desativei a regra e mesmo assim saiu mensagem | A fila já tinha o trabalho criado | Comportamento atual: desativar não esvazia a fila. Cancelar a fila (rollback nível 2) |
| Login "E-mail ou senha incorretos" para quem lembra a senha | Conta desativada, e-mail diferente, senha errada | Não há recuperação de senha. Admin pode criar nova conta com `npm run user:create`; se for a mesma conta, o e-mail tem que ser outro ou o registro antigo precisa ser removido no banco |

## Operações comuns

**Rodar um ciclo à mão** (Admin): tela *Automação* → *Rodar ciclo agora*. Ou:

```bash
curl -X POST -H "x-automation-secret: $AUTOMATION_SECRET" https://SEU-APP.vercel.app/api/automation/tick
```

**Ver a fila e as falhas**

```sql
SELECT status, count(*) FROM "AutomationJob" GROUP BY status;

SELECT j.id, l.name, j.reason, j."lastError", j."updatedAt"
FROM "AutomationJob" j JOIN "Lead" l ON l.id = j."leadId"
WHERE j.status = 'FAILED' AND j."updatedAt" > now() - interval '24 hours'
ORDER BY j."updatedAt" DESC;

SELECT "startedAt", "finishedAt", created, sent, failed, skipped, rescheduled
FROM "AutomationRun" ORDER BY "startedAt" DESC LIMIT 10;
```

**Criar conta**: ver [deploy](../06-deploy-e-go-live/deploy.md#dados-iniciais). **Remover opt-out**: Admin, na tela do lead (*Remover bloqueio de envios*), e só se o próprio lead pediu para voltar. **Apagar dados de um lead** (pedido do titular): Admin, na tela do lead, *Anonimizar*.

**Trocar um segredo**: gerar valor novo, atualizar na Vercel, refazer o deploy e atualizar o n8n. `AUTH_SECRET` novo desconecta todo mundo.

**Atualizar o app**: push na branch principal; a Vercel faz o build e as migrations. Se falhar, a versão anterior continua no ar.

## O que não fazer

- Rodar `npm run db:seed` no banco do piloto.
- Editar `AutomationJob` à mão fora dos procedimentos acima, principalmente linhas em `SENDING`.
- Reenviar manualmente uma mensagem "de estado incerto" sem conferir se ela saiu.
- Usar `MESSAGE_PROVIDER=simulated` para "parar" o envio.
- Colar segredos em conversa, issue ou commit.
- Reativar regras sem entender a causa de um incidente.

## Incidente: o que registrar

Data e hora; o que a Camila viu; o que fez, e em quanto tempo; quantos leads foram afetados; causa; o que mudou para não repetir. Isso alimenta a [retrospectiva](retrospectiva.md).
