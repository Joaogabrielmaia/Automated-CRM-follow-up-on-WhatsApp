# Pulso

Mini CRM para pequenas empresas de serviços, com funil de vendas e follow-up automático no WhatsApp. Construído em torno do medo de incomodar o cliente: só envia em horário comercial, nunca a mesma mensagem duas vezes, para na hora em que o lead responde e respeita quem pede para sair.

> O cenário (Casa Nova Reformas) e as entrevistas do discovery são **simulados**. Não há usuário real nem WhatsApp real conectado: o envio padrão é simulado.

## Subir em 5 minutos

Precisa de Node 20.9+ e Docker.

```bash
cp .env.example .env        # preencha AUTH_SECRET, AUTOMATION_SECRET e WEBHOOK_SECRET
npm install
npm run db:up               # Postgres na porta 5434
npm run db:migrate
npm run db:seed             # contas de teste e leads fictícios
npm run dev                 # http://localhost:3000
```

Contas de teste (senha `Demo@2026`): `marcos@casanova.example` (Admin) e `camila@casanova.example` (Atendente).

## Comandos

| Comando | O que faz |
|---|---|
| `npm test` | Unitários e integração (precisa do banco no ar) |
| `npm run test:e2e` | Testes no navegador, contra o build de produção |
| `npm run typecheck` / `npm run lint` | Tipos e estilo |
| `npm run tick` | Roda um ciclo da automação na linha de comando |
| `npm run simulate:reply -- <telefone> "<texto>"` | Simula uma resposta de lead |
| `npm run db:seed:pilot` | Etapas, modelos e regras (desligadas) para um piloto real |
| `npm run user:create -- <email> "<Nome>" <ADMIN\|ATTENDANT>` | Cria uma conta real (senha em `PULSO_NEW_PASSWORD`) |

## Como funciona

- O app (Next.js + Prisma + PostgreSQL) guarda leads, funil, tarefas e regras.
- A cada 5 minutos o **n8n** chama `POST /api/automation/tick`. Toda a decisão de negócio está no app, em funções puras testadas (`src/lib/rules`) e na orquestração com banco (`src/lib/automation`).
- O envio passa por um `MessageProvider`: `simulated` (padrão) ou `whatsapp-cloud` (API oficial da Meta, ainda não validada contra a Meta de verdade).

## Documentação

Tudo em [`docs/`](docs/00-sobre-este-caso/README.md), na ordem lá descrita.

| Para... | Leia |
|---|---|
| Publicar | [Deploy](docs/06-deploy-e-go-live/deploy.md), [n8n](docs/06-deploy-e-go-live/n8n.md), [checklist](docs/06-deploy-e-go-live/checklist.md) |
| Operar | [Runbook](docs/07-pos-go-live/runbook.md), [rollback](docs/06-deploy-e-go-live/rollback.md) |
| Entender as decisões | [ADRs](docs/03-arquitetura/adr/) |
| Ver o que está testado e o que não | [Qualidade](docs/05-qualidade/README.md) |

## Licença

MIT.
