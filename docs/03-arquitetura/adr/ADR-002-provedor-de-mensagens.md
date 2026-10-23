# ADR-002: interface de provedor e adaptador simulado

**Objetivo:** decidir como o app envia WhatsApp sem ficar preso a um fornecedor e sem mandar mensagem real na demonstração.
**Data:** 22/10/2026 · **Status:** aceita
**Relacionados:** [ADR-005](ADR-005-retentativa-e-falhas.md) · [registro do dono](../../01-discovery/03-registro-dono.md)

## Contexto

A API oficial (WhatsApp Cloud API) exige número dedicado, conta empresarial verificada e, fora da janela de 24h de conversa, modelos de mensagem aprovados. No cenário, o dono não quer trocar o número pessoal. Além disso, a versão publicada do projeto não deve disparar mensagem para telefone nenhum.

## Alternativas

1. Chamar a API oficial direto no motor da automação.
2. Usar uma biblioteca não oficial que controla o WhatsApp Web.
3. Definir uma interface `MessageProvider` com duas implementações: `SimulatedProvider` e `WhatsAppCloudProvider`.

## Escolha

Opção 3. A interface tem um único método, `send({ to, body, idempotencyKey, attempt })`, que devolve o id da mensagem no provedor ou lança um `ProviderError` marcado como definitivo ou temporário. O provedor ativo vem de `MESSAGE_PROVIDER`.

- **`SimulatedProvider` (padrão):** não faz rede. Registra o envio como sucesso. Para eu poder demonstrar falha e retentativa, telefones terminados em `0000` falham de forma temporária, terminados em `0001` falham só na primeira tentativa, e terminados em `9999` falham de forma definitiva.
- **`WhatsAppCloudProvider`:** faz `POST` em `graph.facebook.com/{versão}/{phone-number-id}/messages` com token vindo do ambiente. Escrevi conforme a documentação pública, mas **não testei contra a API real**, porque isso exige conta e número que não tenho.

## Motivo

- Testes e demonstração ficam determinísticos e sem custo.
- Bibliotecas não oficiais violam os termos do WhatsApp e arriscam o número do cliente, justamente o risco que a automação quer evitar (RSK-01).
- Trocar de fornecedor depois é escrever uma classe.

## O que falta para usar a API oficial

1. Número dedicado e conta business verificada na Meta.
2. Definir `MESSAGE_PROVIDER=whatsapp-cloud`, `WHATSAPP_PHONE_NUMBER_ID` e `WHATSAPP_ACCESS_TOKEN` (fora do repositório).
3. Cadastrar e aprovar na Meta modelos de mensagem equivalentes aos meus e informar o nome de cada um na tela *Modelos* (campo "Nome do modelo aprovado na Meta"). **Já implementado (23/10/2026):** com o nome preenchido, o adaptador envia o tipo `template`, e as variáveis do texto, na ordem em que aparecem, viram os parâmetros `{{1}}`, `{{2}}`… Sem o nome, envia texto livre, aceito só dentro da janela de 24h. Falta a aprovação na Meta e testar contra a conta de teste deles.
4. Apontar o webhook da Meta para `/api/webhooks/whatsapp-cloud` e definir `WHATSAPP_APP_SECRET` e `WHATSAPP_VERIFY_TOKEN`. **Já implementado (23/10/2026)**, ver [ADR-007](ADR-007-validacao-do-webhook.md).

## Trade-off

O adaptador simulado pode dar a falsa impressão de que tudo funciona. Por isso a documentação e o README dizem claramente que o envio é simulado, e os itens acima são a lista do que muda.

## Quando eu mudaria de ideia

Se algum cliente já tivesse a API oficial em operação, eu priorizaria testar o adaptador real e adicionar o suporte a modelos aprovados antes de qualquer outra coisa.
