# Segurança e privacidade

**Objetivo:** registrar como o sistema protege acesso e dados, e o que ele escolhe não guardar.
**Data:** 22/10/2026 · **Status:** vigente
**Relacionados:** [ADR-007](adr/ADR-007-validacao-do-webhook.md) · [ADR-008](adr/ADR-008-autenticacao.md) · [RNF-03, RNF-04](../02-definicao/02-requisitos.md)

## Autorização no servidor

- Todo serviço em `src/lib/services` recebe o usuário (`actor`) e chama `authorize(actor, permissão)`. Esconder um botão na tela não é controle de acesso.
- Matriz de permissões:

| Permissão | Atendente | Admin |
|---|---|---|
| Ver e editar leads, tarefas, interações | sim | sim |
| Pausar automação de um lead | sim | sim |
| Editar modelos de mensagem | sim | sim |
| Criar, editar e ativar regras | não | sim |
| Configurar etapas, horário e limites | não | sim |
| Remover opt-out de um lead | não | sim |
| Anonimizar lead | não | sim |
| Rodar ciclo manualmente | não | sim |

- Rotas `tick` e os webhooks não usam sessão. `tick` exige `x-automation-secret`. `/api/webhooks/whatsapp` (formato do Pulso, usado pelo simulador e por integrações próprias) exige `x-pulso-signature` com `WEBHOOK_SECRET`. `/api/webhooks/whatsapp-cloud` (entrada nativa da Meta) exige `X-Hub-Signature-256` com `WHATSAPP_APP_SECRET` nos eventos e `WHATSAPP_VERIFY_TOKEN` na verificação. Sem o segredo configurado, as rotas recusam tudo.

## Validação de entrada

Toda entrada passa por Zod (formulários, corpo do webhook, parâmetros). O Prisma parametriza as consultas, então não monto SQL por concatenação.

## Senhas e sessão

Hash com bcrypt (custo 10). Cookie `httpOnly`, `sameSite=lax`, `secure` em produção. Mensagem de erro de login genérica. Limitações em [ADR-008](adr/ADR-008-autenticacao.md).

## Telefone

Normalizado para `+55DDDNÚMERO` (só dígitos). É a chave para casar a resposta do webhook com o lead, por isso a normalização acontece igual na entrada do formulário e na do webhook.

## Opt-out

Resposta exatamente igual a SAIR, PARAR ou STOP (sem caixa, acento ou pontuação) marca `optedOutAt`, cancela o que estava pendente e bloqueia novos envios. O bloqueio é conferido de novo no momento do envio. Um Atendente não consegue desfazer; é preciso um Admin, e a ação fica registrada no histórico do lead.

## LGPD básica: o que guardo e o que não guardo

- **Guardo:** nome, telefone, origem, interesse, valor estimado, mensagens trocadas no atendimento, tarefas.
- **Não guardo:** CPF, endereço, e-mail do lead, documentos, áudios, imagens, localização.
- **Base:** execução de procedimentos preliminares a contrato, a pedido do próprio titular que pediu orçamento. Isso é minha leitura do cenário, não parecer jurídico.
- **Saída:** opt-out em uma palavra. **Apagar:** o Admin pode anonimizar um lead (nome vira "Lead anonimizado", telefone é substituído, interesse e mensagens são removidos). O que sobra são contagens para o painel.
- **Logs:** não gravam o texto das mensagens, só o evento e o motivo.

## Segredos

`AUTH_SECRET`, `AUTOMATION_SECRET`, `WEBHOOK_SECRET`, `DATABASE_URL`, `DIRECT_URL` e as credenciais do WhatsApp (`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`) vêm do ambiente. O repositório só tem `.env.example` com valores de exemplo. As senhas das contas de teste da versão de demonstração são públicas de propósito e só existem no seed de demonstração (`npm run db:seed`). O ambiente de piloto não roda esse seed: usa `npm run db:seed:pilot` (sem contas) e `npm run user:create` (senha vinda do ambiente, mínimo de 10 caracteres, recusa a senha pública).

## O que não está coberto

Limite de tentativas de login, revogação de sessão, 2FA, criptografia de campos no banco, auditoria completa de acesso, política de retenção automática. Estão em [limitações](../05-qualidade/README.md).
