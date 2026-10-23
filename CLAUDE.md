# Pulso

Mini CRM para pequenas empresas de serviços, com funil de vendas e follow-up automático no WhatsApp.

## Comandos

- `npm run db:up` sobe o Postgres local (porta 5434)
- `npm run db:migrate` / `npm run db:seed` (demonstração, com contas de teste e leads fictícios)
- `npm run db:seed:pilot` etapas, modelos e regras (desligadas) de um piloto real; depois `npm run user:create`
- `npm run db:deploy` aplica as migrations (usa `DIRECT_URL` quando existir)
- `npm run dev` roda o app em http://localhost:3000
- `npm test` roda Vitest (unit + integration, precisa do banco no ar; usa o banco `*_test`)
- `npm run test:e2e` roda Playwright contra o build de produção (banco `*_e2e`, porta 3100)
- `npm run typecheck` e `npm run lint`

## Convenções

- Nomes no código em inglês, textos de interface e documentação em português do Brasil.
- Regras de negócio da automação ficam em `src/lib/rules` (funções puras que recebem `now`) e `src/lib/automation` (orquestração com banco). Nada de regra dentro de componente ou rota.
- Toda rota e server action valida a entrada com Zod e checa a sessão/papel no servidor.
- Commits em Conventional Commits, um por entrega lógica, citando os IDs (RF-xx, RN-xx) quando houver.
- Nenhum segredo no repositório. Variáveis documentadas em `.env.example`.
- Envio de WhatsApp passa sempre por `MessageProvider` (`src/lib/providers`).

## Documentação

Tudo em `docs/`, na ordem de `docs/00-sobre-este-caso/README.md`.
