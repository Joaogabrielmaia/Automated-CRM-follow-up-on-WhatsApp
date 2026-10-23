# Deploy

**Objetivo:** publicar o Pulso (app e banco) e deixá-lo pronto para o n8n chamar.
**Data:** 23/10/2026 · **Status:** escrito a partir do código e do [ADR-009](../03-arquitetura/adr/ADR-009-hospedagem.md); **ainda não executado**. Os pontos que dependem de conferir no primeiro deploy estão marcados com ⚠.
**Relacionados:** [n8n](n8n.md) · [checklist](checklist.md) · [rollback](rollback.md) · [runbook](../07-pos-go-live/runbook.md)

## Visão geral

| Peça | Onde roda | Observação |
|---|---|---|
| App Next.js | Vercel | Deploy a cada push na branch principal |
| Banco PostgreSQL | Neon | Uso a URL do pooler para o app |
| Agendador (n8n) | Docker na minha máquina, ou VPS num piloto | Chama o app; ver [n8n](n8n.md) |
| Provedor de mensagens | `simulated` (padrão) | A API oficial do WhatsApp ainda não está pronta para uso real; ver [rollout](rollout.md) |

## Variáveis de ambiente

Todas estão em `.env.example`. Nenhum valor real vai para o repositório.

| Variável | Valor em produção | Observação |
|---|---|---|
| `DATABASE_URL` | URL do Neon (host com `-pooler`), com `?sslmode=require` | ⚠ ver "Migrations e o pooler" |
| `AUTH_SECRET` | 32 caracteres ou mais, aleatório | O app recusa subir sessão com menos que isso. Trocar invalida todas as sessões |
| `AUTOMATION_SECRET` | Aleatório, diferente dos outros | O n8n manda esse valor no cabeçalho `x-automation-secret` |
| `WEBHOOK_SECRET` | Aleatório, diferente dos outros | Assina o corpo do webhook de entrada |
| `MESSAGE_PROVIDER` | `simulated` | Só vira `whatsapp-cloud` depois da fase 3 do [rollout](rollout.md) |
| `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN` | Vazias | Só com `whatsapp-cloud` |
| `NEXT_PUBLIC_DEMO_ACCOUNTS` | `false` (ou ausente) em piloto; `true` só na demonstração | É lida **na hora do build**. Mudou o valor, precisa de novo deploy |

Gerar um segredo no PowerShell 7:

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Use um valor diferente para cada segredo.

## Passo a passo

1. **Banco.** No Neon, crie um projeto (se houver região em São Paulo, prefira-a). Copie duas strings: a **pooled** (host com `-pooler`) e a **direta**.
2. **Código no GitHub.** Hoje o repositório só existe na minha máquina, sem remoto. Crie o repositório e faça o push.
3. **Projeto na Vercel.** Importe o repositório e, em *Settings → Build & Development*, ponha **Build Command** = `npm run build:vercel`. Esse script roda `prisma generate`, `prisma migrate deploy` e `next build`, nessa ordem, então as migrations são aplicadas no próprio deploy.
4. **Variáveis.** Cadastre as da tabela acima em *Settings → Environment Variables* (Production).
5. **Deploy.** Se a migration falhar, o build falha e a Vercel mantém no ar a versão anterior.
6. **Conferir o app de pé:**

   ```bash
   curl https://SEU-APP.vercel.app/api/health
   ```

   Esperado: `{"status":"ok","database":"ok","provider":"simulated","lastAutomationRunAt":null}`. Com `503`, o banco não está acessível: confira `DATABASE_URL`.
7. **Dados iniciais:** escolha um dos dois caminhos abaixo.
8. **Ligar o agendador:** siga o [guia do n8n](n8n.md).
9. **Fumaça:** entrar com uma conta, abrir Funil, e (como Admin) clicar em *Rodar ciclo agora* na tela Automação. Deve aparecer "Ciclo executado: 0 criada(s)…" e o painel passa a mostrar "Último ciclo há instantes".

## Dados iniciais

**Demonstração.** Aponte `DATABASE_URL` do seu terminal para o Neon e rode `npm run db:seed`. Cria as contas de teste (`marcos@casanova.example` e `camila@casanova.example`, senha pública `Demo@2026`), as etapas, modelos, regras e 7 leads fictícios. Use só em ambiente de demonstração, com `NEXT_PUBLIC_DEMO_ACCOUNTS=true`.

**Piloto (dados reais).** **Não rode o seed**: ele cria contas com senha pública e regras de envio ligadas.

1. Crie as contas de verdade, uma por pessoa. A senha vem de variável de ambiente para não ficar no histórico do terminal:

   ```powershell
   $env:DATABASE_URL = "<url do Neon>"
   $env:PULSO_NEW_PASSWORD = "<senha com 10+ caracteres>"
   npm run user:create -- marcos@empresa.com "Marcos" ADMIN
   npm run user:create -- camila@empresa.com "Camila" ATTENDANT
   ```

2. Entre como Admin e, em *Configurações*, crie as etapas (sem etapas o cadastro de lead falha com "Não existe etapa inicial"). O funil precisa ter ao menos uma aberta, uma ganha e uma perdida. Sugestão: Novo, Contatado, Orçamento enviado (tipo orçamento), Negociação, Ganho, Perdido.
3. Revise horário comercial e limites em *Configurações*. Os padrões são seg–sex 08–18, sáb 08–12, 3 mensagens por ciclo e 12 h de intervalo.
4. Crie os modelos e as regras (que nascem desligadas) seguindo o [rollout](rollout.md).

## Atualizar e voltar atrás

- **Atualizar:** push na branch principal. Teste local antes: `npm test` e `npm run test:e2e`.
- **Voltar atrás:** ver [rollback](rollback.md). Em resumo, a Vercel permite voltar para o deploy anterior, mas **isso não desfaz migration**. Por isso, as mudanças de banco precisam ser sempre aditivas (criar coluna ou tabela, nunca renomear ou apagar no mesmo deploy).

## Ambiente local

```bash
cp .env.example .env     # preencha os segredos
npm install
npm run db:up            # Postgres na porta 5434
npm run db:migrate
npm run db:seed
npm run dev              # http://localhost:3000
```

## ⚠ Pontos para conferir no primeiro deploy

1. **Migrations e o pooler.** O ADR-009 manda usar a URL do pooler. O `prisma migrate deploy` em conexão pooled costuma travar ou falhar, porque usa bloqueios que o pooler não repassa. Se o build ficar parado na migration, use a URL **direta** na etapa de build. A correção estável é declarar `directUrl = env("DIRECT_URL")` no `datasource` do `schema.prisma` e cadastrar `DIRECT_URL` na Vercel. Não fiz isso agora porque exigiria `DIRECT_URL` em todos os ambientes, inclusive nos testes, e não consigo validar contra o Neon sem uma conta.
2. **Banco que "dorme".** No plano gratuito do Neon, a primeira consulta depois de um tempo parado demora. A rota do ciclo tem limite de 60 segundos (`maxDuration`), suficiente para acordar o banco; o n8n repete a chamada se falhar.
3. **Plano da Vercel.** Confira os termos do plano gratuito antes de usar com cliente real: se ele for restrito a uso não comercial, o piloto pede o plano pago.
4. **Backup do banco.** Confira no painel do Neon o que o plano oferece (retenção de histórico, restauração). Não presumo nada aqui; o [checklist](checklist.md) cobra essa conferência.
5. **n8n sem workflow versionado.** A pasta `automations/` está vazia. Monte o fluxo conforme o [guia do n8n](n8n.md) e exporte-o para lá.
