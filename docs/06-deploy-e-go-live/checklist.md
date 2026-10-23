# Checklist de go-live

**Objetivo:** listar o que precisa estar verdadeiro antes de cada fase do [rollout](rollout.md).
**Data:** 23/10/2026 · **Status:** ✔ só onde eu verifiquei; o resto está em aberto de propósito
**Relacionados:** [deploy](deploy.md) · [n8n](n8n.md) · [rollback](rollback.md) · [qualidade](../05-qualidade/README.md)

Legenda: ✔ verificado em 23/10/2026 · ☐ em aberto (precisa de conta, de uma decisão ou de fazer o deploy).

## A. Antes da fase 0 (qualquer uso com dados reais)

### Código e testes

- ✔ `npm run typecheck` e `npm run lint` sem erro nem aviso.
- ✔ `npm test`: 200 testes passando (111 unitários, 89 de integração).
- ✔ `npm run test:e2e`: 16 testes passando, contra o build de produção, 3 execuções seguidas sem falha.
- ✔ `npm run build` conclui.
- ✔ Migrations aplicam em banco vazio (3 migrations) com `scripts/migrate-deploy.mjs`.
- ✔ CI escrita (`.github/workflows/ci.yml`) e o YAML é válido.
- ☐ Repositório publicado no GitHub e **CI verde pela primeira vez** (nunca rodou no GitHub).

### Infraestrutura

- ☐ Banco criado no Neon; strings pooled e direta anotadas.
- ☐ Variáveis cadastradas na Vercel, com `AUTH_SECRET`, `AUTOMATION_SECRET` e `WEBHOOK_SECRET` diferentes entre si e gerados por mim; `DIRECT_URL` com a URL direta.
- ☐ Build Command = `npm run build:vercel`. Nos logs: `[migrate] usando DIRECT_URL`.
- ☐ `NEXT_PUBLIC_DEMO_ACCOUNTS` = `false` (ou ausente).
- ☐ `GET /api/health` responde `ok` na URL pública.
- ☐ Monitor externo em `/api/health?strict=1` cadastrado e testado (desligar o n8n por 20 minutos e ver o alerta).
- ☐ Backup e restauração do banco conferidos no plano do Neon (o que existe, por quanto tempo, como restaurar). Testar a restauração uma vez.
- ☐ Termos do plano da Vercel conferidos para uso com cliente real.

### Segurança e privacidade

- ✔ O seed de piloto não cria contas nem leads, e todas as regras nascem desligadas (`tests/integration/seed-pilot.test.ts`).
- ✔ `user:create` recusa senha com menos de 10 caracteres e a senha pública da demonstração.
- ☐ **`db:seed` (demonstração) não foi rodado** no banco do piloto.
- ☐ Contas reais criadas, uma por pessoa.
- ☐ Login com `marcos@casanova.example` / `Demo@2026` **falha** no ambiente do piloto (já foi verificado num banco de piloto local; repetir no real).
- ☐ Nenhum segredo no repositório (`git log -p` sem `.env`; só `.env.example`).
- ☐ Atendente tenta abrir `/regras` e vê só leitura.
- ☐ Revisão da base legal e do aviso aos leads por quem entende de LGPD. A leitura em [segurança](../03-arquitetura/04-seguranca-e-privacidade.md) é minha, não parecer.
- ☐ Combinado com o Marcos: quem pode ver os dados e por quanto tempo se guardam.

### Dados e configuração

- ☐ `npm run db:seed:pilot` rodado no banco do piloto (etapas, configuração, modelos e 8 regras desligadas).
- ☐ Horário comercial e limites revisados em *Configurações*.
- ☐ Modelos revisados com a Camila usando as [boas práticas](boas-praticas-de-mensagem.md) (nome da empresa trocado).
- ☐ **Todas as regras "[Fase 3]" (mensagens) desligadas.**
- ☐ Leads em aberto trazidos pela importação de CSV; relatório de linhas ignoradas conferido.

### Agendador

- ✔ `automations/tick.json` importa no n8n e a chamada ao ciclo funciona (executei contra um app de produção local).
- ☐ n8n ativo, com `AUTOMATION_SECRET` igual ao da Vercel e `PULSO_APP_URL` apontando para o app publicado.
- ☐ Painel mostra "Último ciclo" com menos de 10 minutos, duas vezes seguidas.
- ☐ Testado: o n8n desativado por 30 minutos e ligado de novo. O ciclo seguinte recupera o atraso sem duplicar nada, e o log mostra o evento "Atrasado".

### Pessoas

- ☐ [Treinamento](treinamento.md) feito com a Camila e o Marcos.
- ☐ Combinado quem faz o quê quando algo falha (ver [runbook](../07-pos-go-live/runbook.md)) e quem pode decidir pausar.
- ☐ O [rollback](rollback.md) foi lido pelo Marcos, e o botão de pausa (desativar o fluxo no n8n) foi ensaiado uma vez.

## B. Antes da fase 1 (ligar a primeira regra de tarefa)

- ☐ Regra ativada **uma por vez**.
- ☐ Teste ponta a ponta com um lead de teste: cadastrar, esperar o tempo da regra e ver a tarefa em *Hoje*. Apagar o lead depois (anonimizar).
- ☐ Camila sabe usar *Registrar contato feito fora do sistema*.

## C. Antes da fase 3 (envio real)

O código está pronto e testado com a rede simulada. O que falta é conta, aprovação e teste com a Meta.

- ✔ Envio de modelo aprovado e recebimento de respostas implementados e testados (`whatsapp-cloud.test.ts`, `webhook-meta.test.ts`, `engine.test.ts`).
- ✔ Desativar regra cancela a fila (RN-19).
- ☐ Conta WhatsApp Business verificada e **número dedicado** (o WhatsApp pessoal do dono fora da integração).
- ☐ Modelos submetidos e **aprovados pela Meta**; o nome de cada um preenchido em *Modelos*.
- ☐ `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET` e `WHATSAPP_VERIFY_TOKEN` cadastradas.
- ☐ Webhook cadastrado na Meta e **verificado** (a Meta aceita a URL).
- ☐ Teste real na sandbox da Meta: um envio de modelo, uma resposta chegando, um SAIR bloqueando o lead. Anotar o que não saiu como esperado.
- ☐ Ensaiado: parar tudo em menos de 2 minutos.
- ☐ Primeiro envio com 5 a 10 leads, acompanhado pela Camila.
