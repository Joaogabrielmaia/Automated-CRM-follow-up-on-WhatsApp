# ADR-009: hospedagem

**Objetivo:** decidir onde publicar o app, o banco e o n8n.
**Data:** 22/10/2026 · **Status:** aceita
**Relacionados:** [ADR-001](ADR-001-n8n-ou-jobs-em-codigo.md) · [deploy](../../06-deploy-e-go-live/deploy.md) · [n8n](../../06-deploy-e-go-live/n8n.md)

## Contexto

Quero uma publicação sem custo, simples de reproduzir. O app é Next.js; o banco, PostgreSQL; o n8n precisa chamar o app a cada 5 minutos.

## App e banco

| Opção | Prós | Contras |
|---|---|---|
| **Vercel + Neon (Postgres)** | Plano gratuito, integração direta com Next.js, deploy a cada push | Funções serverless; banco gratuito "dorme" e a primeira consulta demora |
| Railway / Render | App e banco no mesmo lugar | Plano gratuito mais limitado ou temporário |
| VPS próprio | Controle total | Mais manutenção; custo fixo |

**Escolha:** Vercel + Neon. Uso `DATABASE_URL` com a URL do pooler e rodo `prisma migrate deploy` no build.

## n8n

| Opção | Prós | Contras |
|---|---|---|
| **Docker na minha máquina** | Grátis, igual ao ambiente de desenvolvimento | Só funciona com o computador ligado |
| n8n Cloud | Zero manutenção | Pago após o período de teste |
| Render/Railway com Docker | Sempre ligado | Plano gratuito dorme ou é limitado; n8n pede persistência |
| VPS com Docker | Estável e barato | Exige configurar servidor, HTTPS e backup |
| GitHub Actions agendado | Gratuito e sem servidor | Não é n8n; atraso variável |

**Escolha para a demonstração:** n8n em Docker na minha máquina, chamando a URL pública do app na Vercel. Funciona porque a chamada é sempre de saída. Para um piloto de verdade, eu moveria o n8n para um VPS pequeno com Docker (ver [guia](../../06-deploy-e-go-live/n8n.md)).

## Trade-off

A demonstração tem ciclos só enquanto o n8n local estiver ligado. Para o avaliador isso não atrapalha, porque o Pulso também expõe o botão "Rodar ciclo agora" para o Admin e o simulador de lead.

## Quando eu mudaria de ideia

Ao ter o primeiro usuário real, o n8n sairia da minha máquina no mesmo dia.
