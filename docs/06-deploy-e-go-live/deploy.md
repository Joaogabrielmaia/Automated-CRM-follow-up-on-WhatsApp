# Deploy

**Objetivo:** publicar o Pulso (app e banco) e deixá-lo pronto para o n8n chamar.
**Data:** 23/10/2026 · **Status:** o que depende só do código foi **executado e testado** (lista abaixo). O que depende de contas externas (Vercel, Neon, Meta) está descrito, mas **ainda não foi executado**.
**Relacionados:** [n8n](n8n.md) · [checklist](checklist.md) · [rollout](rollout.md) · [rollback](rollback.md) · [runbook](../07-pos-go-live/runbook.md) · [ADR-009](../03-arquitetura/adr/ADR-009-hospedagem.md)

## O que já foi verificado, e o que não

| Verificado em 23/10/2026 | Como |
|---|---|
| Migrations aplicadas num banco vazio (3 migrations) com `scripts/migrate-deploy.mjs` | Banco novo no Postgres local |
| Build de produção (`npm run build`) e app no ar com `next start` | Build e E2E rodam sobre ele |
| Caminho do piloto do zero: migrations, `db:seed:pilot`, duas contas com `user:create`, login, permissões, cadastro de lead | Banco vazio + app de produção + teste de fumaça |
| Fluxo do n8n (`automations/tick.json`): importa e executa a chamada autenticada ao ciclo | n8n real em Docker contra o app |
| Testes: 200 de unidade e integração, 16 de ponta a ponta; tipos e lint sem erro | `npm test`, `npm run test:e2e` |

| **Não** verificado | Por quê |
|---|---|
| Deploy na Vercel e no Neon | Exige as contas |
| Agendamento de 5 em 5 minutos do n8n por horas seguidas | Só executei a chamada uma vez |
| WhatsApp Cloud API de verdade (envio e webhook) | Exige conta Meta verificada e número dedicado |
| Execução da CI no GitHub | O repositório ainda não está no GitHub |

## Visão geral

| Peça | Onde roda | Observação |
|---|---|---|
| App Next.js | Vercel | Deploy a cada push na branch principal |
| Banco PostgreSQL | Neon | `DATABASE_URL` com o pooler; `DIRECT_URL` direta, só para migrations |
| Agendador (n8n) | Docker na minha máquina, ou VPS num piloto | Só dispara o ciclo; ver [n8n](n8n.md) |
| Provedor de mensagens | `simulated` (padrão) | `whatsapp-cloud` só na fase 3 do [rollout](rollout.md) |

## Variáveis de ambiente

Todas estão em `.env.example`. Nenhum valor real vai para o repositório.

| Variável | Valor em produção | Observação |
|---|---|---|
| `DATABASE_URL` | URL do Neon com `-pooler` no host, mais `?sslmode=require` | Usada pelo app |
| `DIRECT_URL` | URL **direta** do Neon (sem `-pooler`) | Usada só pelas migrations no build. Sem ela, o script usa `DATABASE_URL` e avisa |
| `AUTH_SECRET` | 32 caracteres ou mais, aleatório | O app recusa sessão com menos que isso. Trocar desconecta todo mundo |
| `AUTOMATION_SECRET` | Aleatório, diferente dos outros | O n8n manda no cabeçalho `x-automation-secret` |
| `WEBHOOK_SECRET` | Aleatório, diferente dos outros | Webhook no formato do Pulso (simulador e integrações próprias) |
| `MESSAGE_PROVIDER` | `simulated` | Só vira `whatsapp-cloud` na fase 3 |
| `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN` | Vazias | Só com `whatsapp-cloud` |
| `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN` | Vazias | Só para receber respostas pela Meta; ver [API oficial](#api-oficial-do-whatsapp-fase-3) |
| `NEXT_PUBLIC_DEMO_ACCOUNTS` | `false` (ou ausente) em piloto; `true` só na demonstração | Lida **no build**: mudou, precisa de novo deploy |

`PULSO_APP_URL` e `N8N_VERSION` do `.env.example` são só do n8n local; não vão para a Vercel.

Gerar um segredo no PowerShell 7:

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Use um valor diferente para cada segredo.

## Passo a passo

1. **Banco.** No Neon, crie um projeto (se houver região em São Paulo, prefira-a). Copie as duas strings: a **pooled** (host com `-pooler`) e a **direta**.
2. **Código no GitHub.** O repositório hoje só existe na minha máquina, sem remoto. Crie um repositório **privado** vazio no GitHub e envie:

   ```bash
   git remote add origin https://github.com/SEU-USUARIO/pulso.git
   git push -u origin main
   ```

   A CI (`.github/workflows/ci.yml`) roda sozinha no primeiro push: tipos, lint, testes e E2E, com um Postgres de verdade. Espere ficar verde antes de seguir.
3. **Projeto na Vercel.** Importe o repositório. Em *Settings → Build & Development*, ponha **Build Command** = `npm run build:vercel`. Esse script roda `prisma generate`, depois `scripts/migrate-deploy.mjs` (migrations, pela `DIRECT_URL`) e `next build`.
4. **Variáveis.** Cadastre as da tabela acima em *Settings → Environment Variables* (Production), incluindo `DIRECT_URL`.
5. **Deploy.** Se a migration falhar, o build falha e a Vercel mantém no ar a versão anterior. Nos logs do build, procure `[migrate] usando DIRECT_URL (conexão direta)`.
6. **Conferir o app de pé:**

   ```bash
   curl https://SEU-APP.vercel.app/api/health
   ```

   Esperado: `"status":"ok"`, `"database":"ok"`, `"provider":"simulated"`. Com `503`, o banco não está acessível: confira `DATABASE_URL`.
7. **Dados iniciais:** escolha um dos dois caminhos abaixo.
8. **Ligar o agendador:** siga o [guia do n8n](n8n.md).
9. **Fumaça:** entrar, abrir o Funil e (como Admin) clicar em *Rodar ciclo agora* na tela Automação. Deve aparecer "Ciclo executado: 0 criada(s)…" e o painel passa a mostrar "Último ciclo há instantes".
10. **Monitor externo (recomendado):** num serviço gratuito de monitoramento (UptimeRobot ou similar), cadastre `https://SEU-APP.vercel.app/api/health?strict=1`, a cada 5 minutos. Ele devolve **503 quando o agendador parou há mais de 15 minutos** (com regra ativa), então esse é o alerta de "ninguém está rodando o ciclo".

## Dados iniciais

Os comandos abaixo rodam na sua máquina, apontando para o banco do Neon. Use a **URL direta** nesses comandos.

**Demonstração.** Cria as contas de teste (`marcos@casanova.example` e `camila@casanova.example`, senha pública `Demo@2026`), etapas, modelos, regras ligadas e 7 leads fictícios. Use só em ambiente de demonstração, com `NEXT_PUBLIC_DEMO_ACCOUNTS=true`.

```powershell
$env:DATABASE_URL = "<url direta do Neon>"
npm run db:seed
```

**Piloto (dados reais).** **Não rode `db:seed`**: ele cria contas com senha pública e regras de envio ligadas.

```powershell
$env:DATABASE_URL = "<url direta do Neon>"
npm run db:seed:pilot        # etapas, configuração, modelos e 8 regras, todas DESLIGADAS

$env:PULSO_NEW_PASSWORD = "<senha com 10+ caracteres>"
npm run user:create -- marcos@empresa.com "Marcos" ADMIN
$env:PULSO_NEW_PASSWORD = "<outra senha>"
npm run user:create -- camila@empresa.com "Camila" ATTENDANT
```

Depois:

1. Entre como Admin e revise os modelos (troque "Casa Nova Reformas" pelo nome da empresa) e o horário comercial em *Configurações*.
2. Traga os leads da planilha em *Funil → Importar CSV* (comece com a automação pausada, que é o padrão).
3. As regras seguem o [rollout](rollout.md): as marcadas **[Fase 1]** criam tarefas para a atendente; as **[Fase 3]** enviam mensagens e ficam desligadas.

## API oficial do WhatsApp (fase 3)

Só depois dos pré-requisitos do [rollout](rollout.md). Em resumo:

1. Na Meta, crie o app, obtenha o `WHATSAPP_PHONE_NUMBER_ID` e um token permanente, e copie o **segredo do app** (`WHATSAPP_APP_SECRET`).
2. Invente um texto qualquer para `WHATSAPP_VERIFY_TOKEN`.
3. Cadastre as variáveis na Vercel, refaça o deploy e só então defina `MESSAGE_PROVIDER=whatsapp-cloud`.
4. No painel de webhooks da Meta, informe a URL de retorno `https://SEU-APP.vercel.app/api/webhooks/whatsapp-cloud` e o mesmo token de verificação; assine o campo `messages`. A Meta chama a URL uma vez para verificar; deve ser aceita.
5. Em *Modelos*, preencha "Nome do modelo aprovado na Meta" em cada modelo que a Meta aprovou. As variáveis do texto viram os parâmetros, na ordem em que aparecem.

## Atualizar e voltar atrás

- **Atualizar:** push na branch principal. A CI roda; a Vercel faz o deploy e as migrations.
- **Voltar atrás:** ver [rollback](rollback.md). A Vercel permite voltar para o deploy anterior, mas **isso não desfaz migration**. Mudanças de banco devem ser aditivas (criar coluna ou tabela, nunca renomear ou apagar no mesmo deploy).

## Ambiente local

```bash
cp .env.example .env     # preencha os segredos
npm install
npm run db:up            # Postgres na porta 5434
npm run db:migrate
npm run db:seed
npm run dev              # http://localhost:3000
```

## Pontos para conferir no primeiro deploy real

1. **`DIRECT_URL` aplicada.** Nos logs do build, a linha `[migrate] usando DIRECT_URL`. Se aparecer "DIRECT_URL não definida" e o build travar na migration, é o pooler.
2. **Banco que "dorme".** No plano gratuito do Neon, a primeira consulta depois de um tempo parado demora. A rota do ciclo tem limite de 60 segundos, suficiente para acordar o banco; o n8n repete a chamada se falhar.
3. **Plano da Vercel.** Confira os termos do plano gratuito antes de usar com cliente real: se ele for restrito a uso não comercial, o piloto pede o plano pago.
4. **Backup do banco.** Confira no painel do Neon o que o plano oferece (retenção, restauração). Não presumo nada; o [checklist](checklist.md) cobra essa conferência.
5. **Região.** Vercel e Neon na mesma região, para reduzir a latência entre eles.
