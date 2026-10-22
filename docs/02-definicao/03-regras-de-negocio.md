# Regras de negócio

**Objetivo:** fixar as regras que a automação segue, sem ambiguidade, para eu implementar e testar uma a uma.
**Data:** 22/10/2026 · **Status:** vigente
**Relacionados:** [requisitos](02-requisitos.md) · [ADRs](../03-arquitetura/adr/)

Os valores padrão abaixo vêm dos [registros de discovery](../01-discovery/03-registro-dono.md) e são configuráveis em `/configuracoes` (Admin).

| ID | Regra | Valor padrão / detalhe |
|---|---|---|
| RN-01 | **Horário comercial.** Mensagens automáticas só saem dentro da janela. Fuso fixo America/Sao_Paulo (UTC−3; o Brasil não usa horário de verão desde 2019) | Seg–sex 08:00–18:00, sáb 08:00–12:00, domingo fechado |
| RN-02 | **Fora do horário, a mensagem espera.** Ela entra na fila e sai na próxima abertura da janela. Não é descartada nem enviada antes da hora | Reagendamento para a próxima janela |
| RN-03 | **Opt-out.** Se a resposta do lead, depois de normalizada (sem caixa, acento ou pontuação), for exatamente SAIR, PARAR ou STOP, o lead é marcado como opt-out, as mensagens pendentes são canceladas e nada mais é enviado. Só um Admin remove o opt-out | Palavras: SAIR, PARAR, STOP |
| RN-04 | **Resposta interrompe a sequência.** Qualquer resposta do lead cancela as mensagens pendentes dele, encerra o ciclo atual e cria uma tarefa "Responder" para o responsável | Tarefa com prazo de 2h úteis |
| RN-05 | **Nunca duas vezes a mesma mensagem.** Cada mensagem tem uma chave única: regra + lead + ciclo. Uma segunda tentativa de criar a mesma chave é ignorada | Restrição única no banco |
| RN-06 | **Limite por lead.** No máximo N mensagens automáticas por ciclo sem resposta. Passou do limite, a mensagem é pulada e fica registrado | N = 3 (boas-vindas + 2 follow-ups) |
| RN-07 | **Sequência sem resposta.** Follow-up 1 após 24h, follow-up 2 após 72h e, após 120h, o lead vai para Perdido com o motivo "Sem resposta após follow-ups". Os prazos contam a partir do primeiro contato do ciclo | 24h / 72h / 120h, corridas |
| RN-08 | **Definição de "sem resposta".** O lead não mandou nenhuma mensagem depois do início do ciclo, e o ciclo começa na primeira mensagem enviada a ele depois da criação do lead ou da última resposta dele | Horas corridas, não úteis |
| RN-09 | **Etapas e automação.** Só leads em etapas abertas ou de orçamento recebem automação. Ganho e Perdido encerram tudo: cancelam o que está pendente. Mover para Perdido exige motivo | — |
| RN-10 | **Pausa por lead.** Lead pausado não recebe nada automático até ser retomado | Campo `automationPaused` |
| RN-11 | **Retentativa.** Falha do provedor tenta de novo após 1, 5 e 15 minutos (a tentativa inicial mais 3 retentativas, respeitando RN-01). Erro definitivo (número inválido) não tenta de novo. Se todas falharem, a mensagem fica como falha e uma tarefa é criada para a atendente | Backoff 1/5/15 min, 4 tentativas no total |
| RN-12 | **Boas-vindas.** Lead novo com telefone válido gera uma mensagem agendada para X minutos depois da criação (e pela RN-02 se estiver fora do horário) | X = 5 min |
| RN-13 | **Telefone.** É normalizado para o formato +55DDDNÚMERO e é único entre leads ativos | — |
| RN-14 | **Variável faltando.** Se o modelo usa uma variável que o lead não tem (por exemplo `{valor}` sem valor estimado), a mensagem não é enviada: fica pulada com o motivo registrado. Nunca sai texto com chaves soltas | — |
| RN-15 | **Orçamento sem retorno.** Lead na etapa de orçamento por 48h sem resposta dispara um lembrete para a atendente (tarefa) e uma mensagem ao lead, na mesma chave de idempotência da etapa atual | 48h |
| RN-16 | **Escopo da ação.** Cada regra tem uma ação: enviar mensagem, criar tarefa ou mover para Perdido. Assim o dono pode começar só com lembretes | — |
| RN-17 | **Regra nova não age sobre o passado.** Uma regra só vale para leads criados (boas-vindas), ciclos iniciados (sem resposta) ou entradas na etapa (orçamento) depois do momento em que foi ativada. Isso evita disparar mensagens para toda a base quando o dono liga uma regra | Campo `activatedAt` |
| RN-18 | **Intervalo mínimo entre mensagens.** Duas mensagens automáticas ao mesmo lead precisam de pelo menos 12 horas entre si. Protege de uma rajada quando o ciclo ficou parado e várias regras vencem de uma vez | 12h (720 min) |

## Critérios para mover etapas

- **Manual:** a atendente move livremente entre etapas abertas.
- **Automático:** só uma regra move um lead sozinha, e só para Perdido (RN-07).
- **Orçamento enviado:** ao entrar numa etapa do tipo orçamento, o sistema registra o instante, que serve de base para a RN-15.
