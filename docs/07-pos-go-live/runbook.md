# Runbook de operação

**Objetivo:** dizer a quem opera o Pulso o que olhar todo dia, o que fazer quando algo falha e o que não fazer.
**Data:** 23/10/2026 · **Status:** atualizado em 23/10/2026, a partir do código e dos [modos de falha](../03-arquitetura/05-modos-de-falha.md); **nenhum procedimento foi ensaiado em produção**
**Relacionados:** [rollback](../06-go-live/rollback.md) · [n8n](../06-go-live/n8n.md) · [riscos](../02-definicao/06-riscos.md)

## Papéis

| Quem | Faz |
|---|---|
| Camila (atendente) | Olha *Hoje* todo dia, conclui tarefas, avisa o Marcos de qualquer coisa estranha, **sem mexer** |
| Marcos (dono, Admin) | Decide pausar, para a automação, remove opt-out, olha o painel |
| Quem opera (eu, no piloto) | Banco, n8n, segredos, correções |

## Onde olhar

| O que | Onde | O que significa |
|---|---|---|
| App e banco de pé | `GET /api/health` | `status: ok`; `503` = banco inacessível |
| O ciclo está rodando | Painel ("Último ciclo há…"), tela Automação, e no health o campo `automation` | `ok` = recente; `stale` = parado há mais de 15 min (o n8n roda a cada 5); `never` = nunca rodou; `idle` = não há regra ativa, então não há o que rodar. `?strict=1` devolve 503 em `stale` e `never`, para o monitor externo |
| O que a automação decidiu | Tela *Automação*: fila e log, com filtro por evento e por lead | Cada decisão tem evento e motivo |
| Execuções do agendador | n8n → *Executions* | Verde a cada 5 minutos |
| Falhas que pedem uma pessoa | Tela *Hoje* (tarefas "criada pela automação") | "Verificar contato de…", "Conferir se a mensagem para… foi enviada" |

Eventos do log: Criado, Mensagem enviada, Pulado, Cancelado, Reagendado, Nova tentativa agendada, Falha, **Atrasado**, Fila cancelada, Tarefa criada, Movido para Perdido, Pediu para sair, Lead respondeu, Remetente desconhecido.

Motivos mais comuns: Fora do horário comercial, Intervalo mínimo entre mensagens, Limite de mensagens por ciclo, O lead respondeu, O lead pediu para sair, Automação pausada, Etapa encerrada, **Regra desativada**, Faltou dado do lead, Parâmetros do modelo aprovado incompletos, Tentativas esgotadas, Erro definitivo do provedor, Estado incerto.

## Rotina

**Todo dia útil (2 minutos, Camila ou Marcos):** abrir *Hoje* e *Automação*; ver se "Último ciclo" é recente e se há eventos de **Falha**.

**Toda semana (10 minutos, Marcos):** olhar o painel (leads sem resposta, falhas, motivos de perda); ler cinco mensagens enviadas; conferir o backup do banco.

**Todo mês:** rodar `npm audit`; trocar segredos se alguém saiu da equipe; revisar as contas ativas.

## Problemas e o que fazer

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| "Último ciclo" com mais de 15 minutos (`automation: stale` no health; o monitor externo avisa) | n8n parado, fluxo desativado, ou o app responde erro | 1) n8n → *Executions*: há execuções? 2) Se vermelhas, ver a mensagem (401 = segredos diferentes; 5xx = ver `/api/health`). 3) Admin: *Rodar ciclo agora*. Quando o ciclo volta, ele recupera o atraso sozinho, respeitando o horário, e o log mostra o evento **Atrasado** nos envios que passaram de 15 minutos |
| `/api/health` devolve 503 | Banco inacessível ou `DATABASE_URL` errada | Conferir se o Postgres está no ar. Se foi mudança de variável, voltar o valor e reiniciar o app |
| n8n com 401 no ciclo | `AUTOMATION_SECRET` diferente entre n8n e app | Igualar os dois. O n8n lê do `.env` local ou do `docker-compose.override.yml` |
| n8n com erro de rede/timeout | App fora do ar, ou banco acordando | Ver health. O fluxo tenta 3 vezes sozinho |
| Muitos **Falha** com "Erro definitivo do provedor" | Número do lead inválido (um caso) ou token do WhatsApp inválido (todos) | Um caso: a tarefa "Verificar contato" avisa a Camila. Todos: parar (rollback nível 1) e conferir `WHATSAPP_ACCESS_TOKEN` |
| **Falha** com "Tentativas esgotadas" | Provedor instável durante 4 tentativas | Camila liga/escreve para o lead (tarefa criada). Se afetar vários, parar e conferir o provedor |
| Tarefa "Conferir se a mensagem para X foi enviada" (Estado incerto) | O processo caiu depois de reservar o envio; não dá para saber se saiu | **Não reenviar às cegas.** Conferir no WhatsApp Business ou no painel da Meta se a mensagem existe. Se saiu, concluir a tarefa. Se não saiu, a Camila contata o lead manualmente |
| Mensagens com status *Pulado* e "Faltou dado do lead" | O modelo usa `{servico}` ou `{valor}` e o lead não tem | Preencher o dado no lead, ou trocar o modelo (ver [boas práticas](../06-go-live/boas-praticas-de-mensagem.md)). A mensagem pulada **não** é reenviada depois: o ciclo daquele envio acabou |
| Webhook da Meta (`/api/webhooks/whatsapp-cloud`) responde 401 | `WHATSAPP_APP_SECRET` diferente do segredo do app na Meta | Copiar de novo o segredo do app (Configurações do app → Básico) e reiniciar o app |
| Meta não consegue verificar a URL do webhook (403) | `WHATSAPP_VERIFY_TOKEN` diferente do digitado na Meta, ou não definido | Igualar os dois e reiniciar o app |
| Webhook no formato do Pulso (`/api/webhooks/whatsapp`) responde 401 | `WEBHOOK_SECRET` diferente, ou a assinatura foi calculada sobre um texto diferente do enviado | Igualar o segredo; o corpo assinado precisa ser exatamente o enviado |
| Respostas dos leads não aparecem | Webhook da Meta não cadastrado/assinando `messages`, ou número do remetente sem lead | Conferir o painel de webhooks da Meta; no log da Automação, procurar "Remetente desconhecido". Na fase 1 (sem envio) não há resposta pelo sistema: a conversa é no WhatsApp da Camila |
| Suspeita de mensagem duplicada | — | Parar (rollback 1). Procurar: `SELECT "leadId", body, count(*) FROM "Interaction" WHERE type = 'MESSAGE_OUT' GROUP BY "leadId", body HAVING count(*) > 1;` A chave de idempotência é única no banco, então uma duplicata de verdade seria um defeito grave: guarde o que viu |
| Lead recebeu mensagem depois de pedir SAIR | — | Parar já. Tratar como incidente: [rollback](../06-go-live/rollback.md), seção "Se uma mensagem errada saiu" |
| Desativei a regra e mesmo assim saiu mensagem | Desativar cancela a fila da regra (RN-19). Se saiu, o envio já estava em andamento (`SENDING`) quando desativei, ou foi outra regra | Conferir o log do lead para ver qual regra enviou. Para parar tudo, rollback nível 1 e 2 |
| Fiz uma ação (salvar, ativar) e a tela não mudou, ou o botão ficou em "Salvando…" | Defeito conhecido que a remoção do `loading.tsx` corrigiu (ADR-010). Se voltar, alguém recolocou um `loading.tsx` ou `Suspense` em volta das páginas | Recarregar a página mostra o estado verdadeiro. Reportar: o E2E deve falhar de forma intermitente |
| Mensagem pulada com "Parâmetros do modelo aprovado incompletos" | O modelo tem nome da Meta preenchido e o lead não tem algum dado do texto | Preencher o dado no lead ou usar um modelo sem essa variável |
| Login "E-mail ou senha incorretos" para quem lembra a senha | Conta desativada, e-mail diferente, senha errada | Não há recuperação de senha. Admin pode criar nova conta com `npm run user:create`; se for a mesma conta, o e-mail tem que ser outro ou o registro antigo precisa ser removido no banco |

## Operações comuns

**Rodar um ciclo à mão** (Admin): tela *Automação* → *Rodar ciclo agora*. Ou:

```bash
curl -X POST -H "x-automation-secret: $AUTOMATION_SECRET" http://localhost:3000/api/automation/tick
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

**Criar conta**: `npm run user:create -- <email> "<Nome>" <ADMIN|ATTENDANT>`, com a senha em `PULSO_NEW_PASSWORD`. **Remover opt-out**: Admin, na tela do lead (*Remover bloqueio de envios*), e só se o próprio lead pediu para voltar. **Apagar dados de um lead** (pedido do titular): Admin, na tela do lead, *Anonimizar*.

**Trocar um segredo**: gerar valor novo, atualizar no `.env`, reiniciar o app e atualizar o n8n. `AUTH_SECRET` novo desconecta todo mundo.

**Atualizar o app**: `git pull`, `npm install`, `npx prisma migrate deploy` e reiniciar. Mudanças de banco devem ser aditivas (nova tabela ou coluna opcional), para a versão anterior continuar funcionando.

## O que não fazer

- Rodar `npm run db:seed` no banco do piloto.
- Editar `AutomationJob` à mão fora dos procedimentos acima, principalmente linhas em `SENDING`.
- Reenviar manualmente uma mensagem "de estado incerto" sem conferir se ela saiu.
- Usar `MESSAGE_PROVIDER=simulated` para "parar" o envio.
- Colar segredos em conversa, issue ou commit.
- Reativar regras sem entender a causa de um incidente.

## Incidente: o que registrar

Data e hora; o que a Camila viu; o que fez, e em quanto tempo; quantos leads foram afetados; causa; o que mudou para não repetir. Isso alimenta a [retrospectiva](retrospectiva.md).
