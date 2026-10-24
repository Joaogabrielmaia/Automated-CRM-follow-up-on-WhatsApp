# Rodar o Pulso localmente

Precisa de Node 20.9+ e Docker.

```bash
cp .env.example .env        # preencha AUTH_SECRET, AUTOMATION_SECRET e WEBHOOK_SECRET
npm install
npm run db:up               # Postgres na porta 5434
npm run db:migrate
npm run db:seed             # contas de teste e leads fictícios
npm run dev                 # http://localhost:3000
```

Contas de teste do seed (senha `Demo@2026`): `marcos@casanova.example` (Admin) e `camila@casanova.example` (Atendente).

| Comando | O que faz |
|---|---|
| `npm test` | Unitários e integração (precisa do banco no ar) |
| `npm run test:e2e` | Testes no navegador, contra o build de produção |
| `npm run typecheck` / `npm run lint` | Tipos e estilo |
| `npm run tick` | Roda um ciclo da automação na linha de comando; aceita uma data simulada |
| `npm run simulate:reply -- <telefone> "<texto>"` | Simula uma resposta de lead |
| `npm run db:seed:pilot` | Etapas, modelos e regras (desligadas) para um piloto real |
| `npm run user:create -- <email> "<Nome>" <ADMIN\|ATTENDANT>` | Cria uma conta real (senha em `PULSO_NEW_PASSWORD`) |

O n8n é opcional e sobe com `docker compose --profile n8n up -d n8n`: [passo a passo](docs/06-go-live/n8n.md).
