# ADR-008: autenticação

**Objetivo:** escolher como autenticar e como justificar a biblioteca.
**Data:** 22/10/2026 · **Status:** aceita
**Relacionados:** [RF-01, RNF-03](../../02-definicao/02-requisitos.md) · [segurança](../04-seguranca-e-privacidade.md)

## Contexto

Preciso de e-mail e senha com dois papéis, em Next.js App Router, rodando serverless. Quero conseguir explicar cada linha da autenticação numa entrevista.

## Alternativas

1. **Auth.js (NextAuth v5):** completo, com provedores, adaptadores e callbacks. Para e-mail e senha eu usaria só o provedor de credenciais, que obriga sessão JWT e dispensa quase tudo que a biblioteca oferece de valor (adaptador de banco, login social).
2. **Lucia / Better Auth:** boas, mas mais um conceito e uma dependência para um caso simples.
3. **Sessão própria:** `bcryptjs` para o hash da senha e `jose` para assinar um JWT num cookie `httpOnly`.

## Escolha

Opção 3. São cerca de 80 linhas em `src/lib/auth`: `hashPassword`/`verifyPassword` (bcrypt, custo 10), `createSession`/`readSession` (JWT HS256, 8 horas, cookie `httpOnly`, `sameSite=lax`, `secure` em produção) e `requireUser`/`requireRole`. O middleware só redireciona quem não tem cookie; **a autorização de verdade acontece no servidor**, em cada serviço.

## Motivo

- Para e-mail e senha, o Auth.js me traria menos do que parece: eu usaria só o provedor de credenciais com sessão JWT, que é o mesmo que escrevo à mão.
- Código curto e meu, fácil de revisar e testar.
- `bcryptjs` é JavaScript puro e funciona em qualquer ambiente, sem compilar nada.

## Trade-off

Eu assumo o que a biblioteca resolveria: sem recuperação de senha, sem bloqueio por tentativas, sem revogação de sessão (o JWT vale até expirar), sem 2FA. Não houve tempo nem necessidade no cenário, e deixo isso como limitação.

## Quando eu mudaria de ideia

Ao precisar de login social, recuperação de senha ou revogação de sessão, eu adotaria uma biblioteca (Better Auth ou Auth.js estável) em vez de ampliar a minha.
