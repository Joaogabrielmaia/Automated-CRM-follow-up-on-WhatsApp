# Requisitos

**Objetivo:** listar o que o Pulso precisa fazer (RF) e como precisa se comportar (RNF), com IDs.
**Data:** 22/10/2026 · **Status:** vigente
**Relacionados:** [regras de negócio](03-regras-de-negocio.md) · [histórias](04-historias-de-usuario.md) · [rastreabilidade](07-rastreabilidade.md)

## Requisitos funcionais

| ID | Requisito | Origem |
|---|---|---|
| RF-01 | Login por e-mail e senha, com dois papéis: Admin e Atendente | Atendente / Dono |
| RF-02 | Cadastrar, editar e arquivar leads: nome, telefone, origem, interesse, valor estimado, responsável | P4 |
| RF-03 | Configurar etapas do funil (criar, renomear, reordenar), cada uma com um tipo: aberta, orçamento, ganha ou perdida | Atendente |
| RF-04 | Quadro do funil com os leads por etapa e movimentação entre etapas | P4 |
| RF-05 | Histórico de interações por lead: mensagens enviadas e recebidas, notas e mudanças de etapa | P4 |
| RF-06 | Tarefas com prazo por lead e lista "O que fazer hoje" | P1, atendente |
| RF-07 | Modelos de mensagem com variáveis `{nome}`, `{servico}` e `{valor}` | Atendente |
| RF-08 | Regras de automação configuráveis (gatilho, atraso, ação, modelo), com ativar e desativar | Dono |
| RF-09 | Lead novo recebe boas-vindas em até X minutos | P2 |
| RF-10 | Sem resposta: follow-up 1 em 24h, follow-up 2 em 72h e, depois do prazo final, mover para Perdido com motivo | P1 |
| RF-11 | Orçamento enviado sem retorno em 48h: lembrete para a atendente e mensagem ao lead | P1 |
| RF-12 | Pausar e retomar a automação de um lead específico | Atendente |
| RF-13 | Webhook de entrada com validação de assinatura; a resposta do lead interrompe a sequência | P3 |
| RF-14 | Opt-out: a palavra SAIR bloqueia novos envios | Cliente |
| RF-15 | Painel: leads por etapa, taxa de passagem entre etapas, leads sem resposta, mensagens enviadas e falhas, desempenho por origem | P4, P6 |
| RF-16 | Log de execuções da automação visível na interface | Dono |
| RF-17 | Simulador de lead para reproduzir uma resposta chegando | Demonstração |
| RF-18 | Ao mover para Perdido, exigir o motivo | P5 |
| RF-19 | Endpoint de healthcheck | Operação |

## Requisitos não funcionais

| ID | Requisito | Critério |
|---|---|---|
| RNF-01 | **Idempotência:** a mesma mensagem nunca é enviada duas vezes, mesmo com o ciclo da automação rodando em duplicidade ou em paralelo | Teste de integração chamando o ciclo várias vezes e conferindo uma única mensagem |
| RNF-02 | **Retentativa:** falha do provedor tenta de novo com espera crescente, no máximo 3 retentativas, e depois registra a falha | Teste com provedor que falha |
| RNF-03 | **Autorização no servidor:** toda rota e ação confere sessão e papel; esconder botão na tela não conta | Testes de integração por papel |
| RNF-04 | **LGPD básica:** coleto só nome, telefone e o que a venda exige; o lead pode sair (opt-out); dá para anonimizar um lead; não guardo conteúdo além da conversa do atendimento | Revisão em [segurança e privacidade](../03-arquitetura/04-seguranca-e-privacidade.md) |
| RNF-05 | **Usabilidade:** "O que fazer hoje" a no máximo dois cliques do início; interface responsiva e navegável por teclado; estados de carregamento, vazio e erro | Revisão manual e teste E2E mobile |
| RNF-06 | **Desempenho:** um ciclo da automação processa até 100 mensagens por execução; páginas principais com lista paginada ou limitada | Limites no código; sem meta de tempo medida |
| RNF-07 | **Observabilidade:** cada decisão da automação (criou, enviou, pulou, cancelou, falhou) deixa um registro com o motivo | Tela do log |
| RNF-08 | **Testabilidade:** regras de negócio são funções que recebem a hora como parâmetro | Testes unitários sem relógio real |
| RNF-09 | **Webhook seguro:** assinatura HMAC com comparação em tempo constante; evento repetido é descartado | Testes do webhook |
