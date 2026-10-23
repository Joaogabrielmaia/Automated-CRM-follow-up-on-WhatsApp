# Checklist de go-live

**Objetivo:** listar o que precisa estar verdadeiro antes de cada fase do [rollout](rollout.md).
**Data:** 23/10/2026 · **Status:** ✔ só onde eu verifiquei hoje; o resto está em aberto de propósito
**Relacionados:** [deploy](deploy.md) · [n8n](n8n.md) · [rollback](rollback.md) · [qualidade](../05-qualidade/README.md)

Legenda: ✔ verificado em 23/10/2026 · ☐ em aberto.

## A. Antes da fase 0 (qualquer uso com dados reais)

### Código e testes

- ✔ `npm run typecheck` sem erro; `npm run lint` com 2 avisos de variável não usada em `src/app/actions/config.ts`.
- ✔ `npm test`: 129 testes passando (77 unitários, 52 de integração).
- ✔ `npm run test:e2e`: 14 testes passando.
- ☐ CI rodando os testes a cada push. **Não existe** `.github/workflows`; o Definition of Done pede "CI verde" e hoje não há CI.
- ☐ Repositório publicado no GitHub (hoje só local, sem remoto).

### Infraestrutura

- ☐ Banco criado no Neon; string pooled e direta anotadas.
- ☐ ⚠ Migration aplicada no deploy com sucesso (ver o ponto do pooler em [deploy](deploy.md)).
- ☐ Variáveis cadastradas na Vercel, com `AUTH_SECRET`, `AUTOMATION_SECRET` e `WEBHOOK_SECRET` diferentes entre si e gerados por mim.
- ☐ `NEXT_PUBLIC_DEMO_ACCOUNTS` = `false` e novo deploy depois de mudar.
- ☐ `GET /api/health` responde `ok` na URL pública.
- ☐ Backup e restauração do banco conferidos no plano do Neon (o que existe, por quanto tempo, como restaurar). Testar a restauração uma vez.
- ☐ Termos do plano da Vercel conferidos para uso com cliente real.

### Segurança e privacidade

- ☐ **Seed não foi rodado** no banco do piloto (ele cria senha pública `Demo@2026`).
- ☐ Contas reais criadas com `npm run user:create`, senhas com 10+ caracteres, uma por pessoa.
- ☐ Login com `marcos@casanova.example` / `Demo@2026` **falha** no ambiente do piloto.
- ☐ Nenhum segredo no repositório (`git log -p` sem `.env`; só `.env.example`).
- ☐ Atendente tenta abrir `/regras` e vê só leitura; não consegue criar regra.
- ☐ Revisão da base legal e do aviso aos leads por quem entende de LGPD. A leitura em [segurança](../03-arquitetura/04-seguranca-e-privacidade.md) é minha, não parecer.
- ☐ Combinado com o Marcos: quem pode ver os dados e por quanto tempo se guardam.

### Dados e configuração

- ☐ Etapas criadas (ao menos uma aberta, uma de orçamento, uma ganha, uma perdida).
- ☐ Horário comercial e limites revisados em *Configurações*.
- ☐ Modelos revisados com a Camila usando as [boas práticas](boas-praticas-de-mensagem.md).
- ☐ **Todas as regras "Enviar mensagem" desligadas** (fases 1 e 2).
- ☐ Leads em aberto cadastrados.

### Agendador

- ☐ Fluxo 1 do n8n montado, ativo e exportado para `automations/tick.json`.
- ☐ `AUTOMATION_SECRET` do n8n igual ao da Vercel; uma execução manual devolve `runId`.
- ☐ Painel mostra "Último ciclo" com menos de 10 minutos, duas vezes seguidas.
- ☐ Testado: o n8n desativado por 30 minutos e ligado de novo. O ciclo seguinte recupera o atraso sem duplicar nada.

### Pessoas

- ☐ [Treinamento](treinamento.md) feito com a Camila e o Marcos.
- ☐ Combinado quem faz o quê quando algo falha (ver [runbook](../07-pos-go-live/runbook.md)) e quem pode decidir pausar.
- ☐ O [rollback](rollback.md) foi lido pelo Marcos, e o botão de pausa (desativar o fluxo no n8n) foi ensaiado uma vez.

## B. Antes da fase 1 (ligar a primeira regra de tarefa)

- ☐ Regra criada, revisada e **ativada uma por vez**.
- ☐ Teste ponta a ponta com um lead de teste: cadastrar, esperar o tempo da regra e ver a tarefa em *Hoje*. Apagar o lead depois (anonimizar).
- ☐ Camila sabe usar *Registrar contato feito fora do sistema*.

## C. Antes da fase 3 (envio real). Nenhum item abaixo está feito.

- ☐ Tudo da fase 2 do [rollout](rollout.md).
- ☐ Provedor `whatsapp-cloud` testado na sandbox da Meta e coberto por teste automatizado.
- ☐ Modelos aprovados pela Meta.
- ☐ Fluxo 2 do n8n (respostas) funcionando, com um SAIR de teste bloqueando o lead.
- ☐ Regra desativada passa a cancelar a fila (hoje não cancela; ver [rollback](rollback.md)).
- ☐ Número dedicado, e o WhatsApp pessoal do dono **fora** da integração.
- ☐ Ensaiado: parar tudo em menos de 2 minutos.
- ☐ Primeiro envio com 5 a 10 leads, acompanhado pela Camila.
