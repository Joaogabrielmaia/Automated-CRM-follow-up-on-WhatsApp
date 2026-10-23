# Rollback

**Objetivo:** dizer como parar a automação, desfazer o estrago e voltar uma versão, do mais rápido ao mais invasivo.
**Data:** 23/10/2026 · **Status:** escrito a partir do código; os comandos de banco foram conferidos contra o schema, mas **o ensaio num ambiente real ainda não foi feito**
**Relacionados:** [runbook](../07-pos-go-live/runbook.md) · [modos de falha](../03-arquitetura/05-modos-de-falha.md) · [rollout](rollout.md) · [checklist](checklist.md)

## Quando voltar atrás

Pare **na hora, sem discutir**, se acontecer qualquer um destes (são as metas M3 e as regras RN-01, RN-03, RN-05):

- Uma mensagem **duplicada** para o mesmo lead.
- Uma mensagem **fora do horário comercial**.
- Uma mensagem para um lead que **pediu SAIR** ou que **já tinha respondido**.
- Mensagem com texto quebrado (`{valor}` visível).
- O número do WhatsApp ficar restrito ou bloqueado.
- Um lead reclamar, qualquer que seja o motivo.

Depois de parar, investigue com calma pelo [runbook](../07-pos-go-live/runbook.md).

## O que importa saber antes

**Desativar uma regra não esvazia a fila.** Desativar impede que a regra crie **novos** trabalhos (é o que a HU-07 pede), mas os que já foram criados e estão pendentes continuam sendo executados no próximo ciclo. Isso é um comportamento real do código hoje (`processDueJobs` não confere se a regra está ativa) e está no [roadmap](../07-pos-go-live/retrospectiva.md) como correção. Até lá, **desativar regra não é um botão de parada**: use os níveis abaixo.

**Nunca use `MESSAGE_PROVIDER=simulated` como forma de parar.** O provedor simulado marca a mensagem como enviada e a registra no histórico do lead sem sair nada, o que bagunça os dados e engana a atendente.

## Níveis de parada, do mais rápido ao mais lento

### 1. Parar o agendador (segundos)

No n8n, desative o fluxo (interruptor **Active**). Nenhum ciclo automático roda mais. É o botão de pânico.

Limite: o botão *Rodar ciclo agora* (Admin, tela Automação) ainda funciona. Não o use enquanto estiver parado.

### 2. Esvaziar a fila (1 minuto)

Cancela o que está pendente. Rode no console SQL do Neon:

```sql
UPDATE "AutomationJob"
SET status = 'CANCELED', reason = 'ROLLBACK'
WHERE status = 'PENDING';
```

Confira antes quantos serão afetados: `SELECT count(*) FROM "AutomationJob" WHERE status = 'PENDING';`. Jobs em `SENDING` terminam sozinhos ou viram `FAILED` (estado incerto) em até 10 minutos; não mexa neles.

### 3. Travar o endpoint (2 minutos)

Troque `AUTOMATION_SECRET` na Vercel e faça novo deploy. O app passa a responder 401 para o n8n com o valor antigo. Use se houver suspeita de que outra pessoa ou outro n8n esteja chamando o ciclo.

### 4. Por lead

- *Pausar automação* na tela do lead: cancela a fila dele e bloqueia envios.
- Lead que pediu para sair já fica bloqueado sozinho.
- Para tirar um lead de vez do funil: *Arquivar lead*.

### 5. Desligar as regras

Depois de esvaziar a fila (nível 2), desative as regras na tela *Regras*. Em ordem inversa à que foram ligadas.

## Se uma mensagem errada saiu

Mensagem enviada não se desfaz. O que dá para fazer:

1. Pare (nível 1) e esvazie a fila (nível 2).
2. Descubra quem recebeu. Em `SENT` do período:

   ```sql
   SELECT l.name, l.phone, j."sentAt", r.name AS regra
   FROM "AutomationJob" j
   JOIN "Lead" l ON l.id = j."leadId"
   JOIN "AutomationRule" r ON r.id = j."ruleId"
   WHERE j.status = 'SENT' AND j."sentAt" > now() - interval '2 hours'
   ORDER BY j."sentAt";
   ```
3. A Camila fala pessoalmente com cada pessoa, com uma explicação curta e um pedido de desculpa, sem mandar outra mensagem automática.
4. Registre o ocorrido na linha do tempo de cada lead (*Nota*) e na [retrospectiva](../07-pos-go-live/retrospectiva.md).

## Voltar uma versão do app

1. Na Vercel, abra o deploy anterior que funcionava e restaure-o (*Instant Rollback* / promover). Leva minutos.
2. **Isso não desfaz mudanças de banco.** O Prisma aqui não tem migration de volta. Por isso:
   - Cada mudança de banco deve ser **aditiva** (nova tabela, nova coluna opcional). Apagar ou renomear coluna é feito em dois deploys, com o código parando de usar antes.
   - A versão antiga do código precisa continuar funcionando com o banco novo. Teste isso antes de fazer a migration.
3. Se a migration for o problema, restaure o banco a partir do backup do Neon para um ponto anterior ao deploy. Isso apaga o que foi escrito depois (leads, interações), então só como último recurso e com o Marcos avisado. **Ensaiar a restauração uma vez** está no [checklist](checklist.md).

## Depois de qualquer rollback

- Não reative nada no mesmo dia sem entender a causa.
- Reative uma regra por vez, como no [rollout](rollout.md).
- Confira o painel (*Último ciclo*) e o log da automação por pelo menos dois ciclos.
- Escreva o que aconteceu: o que viu, o que fez, quanto tempo levou para parar.
