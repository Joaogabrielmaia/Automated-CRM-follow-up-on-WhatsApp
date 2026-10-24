# Glossário

Termos usados no projeto, com uma linha de definição e um link para onde aparecem.

| Termo | Definição | Onde aparece |
|---|---|---|
| ADR | Registro de uma decisão de arquitetura: contexto, alternativas, escolha, trade-off e quando mudaria | [ADR-001](03-arquitetura/adr/ADR-001-n8n-ou-jobs-em-codigo.md) |
| Backoff | Espera crescente entre tentativas de reenvio depois de uma falha; aqui, 1, 5 e 15 minutos | [RN-11](02-definicao/03-regras-de-negocio.md) · [ADR-005](03-arquitetura/adr/ADR-005-retentativa-e-falhas.md) |
| CI | Rotina automática que roda tipos, lint e testes a cada envio de código ao GitHub | [Qualidade](05-qualidade/README.md) |
| E2E | Teste de ponta a ponta: um navegador de verdade usa o app como a atendente usaria | [Qualidade](05-qualidade/README.md) |
| Follow-up | Mensagem de retorno a um lead que não respondeu; aqui, na ordem 24h, 72h e depois Perdido | [RN-07](02-definicao/03-regras-de-negocio.md) |
| Funil | Quadro com as etapas pelas quais o lead passa, de Novo até Ganho ou Perdido | [Tela do funil](imagens/README.md#3-funil) · [ADR-006](03-arquitetura/adr/ADR-006-etapas-configuraveis.md) |
| Idempotência | Garantia de que repetir uma operação não repete o efeito: a mesma mensagem não sai duas vezes | [ADR-003](03-arquitetura/adr/ADR-003-idempotencia.md) · [RN-05](02-definicao/03-regras-de-negocio.md) |
| Janela comercial | Dias e horas em que a automação pode enviar; fora dela a mensagem espera na fila | [RN-01 e RN-02](02-definicao/03-regras-de-negocio.md) · [ADR-004](03-arquitetura/adr/ADR-004-agendamento-e-fila.md) |
| Lead | Pessoa que pediu contato ou orçamento e ainda não fechou | [Negócio e personas](01-discovery/02-negocio-e-personas.md) |
| n8n | Ferramenta de automação usada aqui só como agendador: chama o app a cada 5 minutos | [ADR-001](03-arquitetura/adr/ADR-001-n8n-ou-jobs-em-codigo.md) · [n8n](06-go-live/n8n.md) |
| Opt-out | Pedido do lead para não receber mais mensagens (SAIR, PARAR ou STOP) | [RN-03](02-definicao/03-regras-de-negocio.md) |
| Persona | Retrato de um tipo de usuário, usado para decidir o que construir | [Negócio e personas](01-discovery/02-negocio-e-personas.md) |
| Provedor de mensagens | Peça que faz o envio de fato; o app fala com uma interface, e por trás há o provedor simulado ou o da WhatsApp Cloud API | [ADR-002](03-arquitetura/adr/ADR-002-provedor-de-mensagens.md) |
| RF, RNF, RN, HU, RSK | Requisito funcional, requisito não funcional, regra de negócio, história de usuário e risco | [Episódio 0](00-sobre-este-caso/README.md) |
| Rollback | Voltar atrás: parar a automação e desfazer o que ela fez | [Rollback](06-go-live/rollback.md) |
| Rollout | Plano de entrada em uso, por fases | [Rollout](06-go-live/rollout.md) |
| Runbook | Roteiro de operação: o que olhar e o que fazer quando algo falha | [Runbook](07-pos-go-live/runbook.md) |
| Webhook | Aviso que outro sistema envia ao app quando algo acontece, como uma resposta do lead; aqui vem assinado (HMAC) | [ADR-007](03-arquitetura/adr/ADR-007-validacao-do-webhook.md) |
