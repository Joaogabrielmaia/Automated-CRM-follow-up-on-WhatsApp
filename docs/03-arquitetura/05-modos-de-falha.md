# Modos de falha

**Objetivo:** dizer o que acontece, e o que a pessoa vê, quando as peças falham.
**Data:** 22/10/2026 · **Status:** vigente
**Relacionados:** [fluxo](02-fluxo-da-automacao.md) · [riscos](../02-definicao/06-riscos.md) · [runbook](../07-pos-go-live/runbook.md)

| Falha | O que acontece | O que impede o pior | O que a pessoa vê |
|---|---|---|---|
| **n8n cai** | Nenhum ciclo roda | O estado está no banco. Quando o n8n volta, o próximo ciclo cria e envia o que atrasou, ainda respeitando o horário. Mensagens muito atrasadas ainda saem na janela, e o evento "Atrasado" (mais de 15 minutos depois do previsto) aparece no log | O painel mostra "último ciclo há X minutos"; `/api/health` informa `automation: stale`, e com `?strict=1` devolve 503 para um monitor externo avisar; Admin pode clicar em "Rodar ciclo agora" |
| **App fora do ar** | n8n recebe erro na chamada | O fluxo do n8n repete a chamada 3 vezes e marca a execução como falha | Execução em vermelho no n8n |
| **Banco indisponível** | Ciclo falha no início | Nada foi reservado, nada foi enviado | `/api/health` devolve 503 |
| **Provedor devolve erro temporário** | Envio falha | Backoff de 1, 5 e 15 minutos, no mesmo job e mesma chave | Log mostra a tentativa; mensagem aparece como pendente |
| **Provedor devolve erro definitivo** | Envio falha | Sem retentativa; o job vira FAILED e gera tarefa | Falha no log, tarefa "Verificar contato" |
| **Processo morre depois de reservar o job** | Não sei se a mensagem saiu | Job em SENDING há mais de 10 min vira FAILED "estado incerto", sem reenvio | Tarefa para conferir manualmente |
| **Ciclo roda duas vezes ao mesmo tempo** | Duas execuções disputam os mesmos jobs | Chave única na criação e reserva atômica no envio | Nada de especial; só uma envia |
| **Webhook chega duplicado** | Provedor reenvia o evento | `eventId` único: o segundo é descartado com 200 | Uma interação só no histórico |
| **Webhook com assinatura errada** | Tentativa de forjar ou segredo desalinhado | 401, nada é gravado | Erro no log da aplicação |
| **Resposta chega no meio de um ciclo** | O job pode já estar reservado | O job relê o lead antes de enviar e cancela se houve resposta depois da criação | Job CANCELED por "lead respondeu" |
| **Resposta de número desconhecido** | Sem lead correspondente | Evento é guardado, nenhum dado de lead é alterado | Registro "remetente desconhecido" no log |
| **Modelo com variável sem dado** | Faltaria texto no lugar de `{valor}` | O envio é pulado (SKIPPED), nunca sai texto incompleto | Log com o motivo |
| **Regra desativada com trabalho na fila** | O que a regra já criou ainda estava pendente | Desativar cancela esses envios na hora e o motor confere de novo antes de executar (RN-19) | Log "Fila cancelada" / job CANCELED por "Regra desativada" |
| **Ação de formulário não atualiza a tela** | Observado em produção com `loading.tsx` (8 em 80 ações) | `loading.tsx` removido; ver [ADR-010](adr/ADR-010-sem-loading-tsx.md) | Nada: a tela atualiza |
