# Episódio 6 — Go-live

Como o Pulso entraria em uso. A decisão principal do [rollout](rollout.md): começar avisando a atendente, sem enviar mensagem ao lead.

Nenhum destes documentos foi executado: o rollout é proposta, o treinamento não foi aplicado e o rollback não foi ensaiado. O status de cada um está na tabela.

O n8n tem o fluxo versionado em `automations/tick.json`; o agendamento por horas não foi testado.

| Documento | O que contém | Itens |
|---|---|---|
| [rollout.md](rollout.md) | Fases 0 a 3, com critérios para avançar ou parar | Status: proposta |
| [n8n.md](n8n.md) | Como subir o n8n e importar o fluxo | Status: fluxo versionado; agendamento por horas não testado |
| [boas-praticas-de-mensagem.md](boas-praticas-de-mensagem.md) | Como escrever os modelos sem soar como cobrança | Status: vigente; nenhum texto testado com cliente |
| [treinamento.md](treinamento.md) | Sessões da atendente (90 min) e do dono (30 min) | Status: proposta, não aplicada |
| [rollback.md](rollback.md) | Cinco níveis de parada, do mais rápido ao mais lento | Status: comportamento coberto por teste; ensaio não feito |

[← Episódio 5: Qualidade](../05-qualidade/README.md) · [Índice](../INDEX.md) · [Episódio 7: Pós-go-live →](../07-pos-go-live/README.md)
