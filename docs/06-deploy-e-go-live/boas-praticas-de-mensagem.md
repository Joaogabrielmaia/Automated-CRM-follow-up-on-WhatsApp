# Boas práticas de mensagem

**Objetivo:** guiar quem escreve os modelos de mensagem para o Pulso não soar como robô nem como cobrança.
**Data:** 23/10/2026 · **Status:** vigente
**Relacionados:** [RSK-01, RSK-07](../02-definicao/06-riscos.md) · [registro do cliente](../01-discovery/05-registro-cliente.md) · [regras de negócio](../02-definicao/03-regras-de-negocio.md)

> A base destas recomendações é a conversa simulada com a "Renata" (uma IA no papel da cliente-tipo) e o bom senso. Não testei nenhum texto com cliente de verdade. Trate como ponto de partida e meça: taxa de resposta e pedidos de SAIR dizem mais que este guia.

## O que o sistema já garante (não precisa escrever no texto)

- Só sai mensagem em horário comercial (RN-01, RN-02).
- No máximo 3 mensagens por lead sem resposta, com 12 h de intervalo entre elas (RN-06, RN-18).
- Se o lead responde, a sequência para na hora (RN-04). Se escreve SAIR, PARAR ou STOP, nada mais é enviado (RN-03).

O texto só precisa cuidar do tom.

## Regras de texto

1. **Uma ideia por mensagem.** Uma pergunta, no máximo.
2. **Sem tom de cobrança.** Evite "ainda tem interesse?", "só passando para lembrar", "última chance". A cliente do cenário disse que isso soa como pressão.
3. **Seja específico.** Cite o serviço (`{servico}`) e, no caso do orçamento, o valor (`{valor}`). Mensagem genérica parece disparo em massa.
4. **Dê uma saída fácil.** Uma frase como "se não for o momento, sem problema" reduz a irritação mais do que insistir.
5. **Avise como parar, uma vez.** Na **primeira** mensagem automática, inclua "Se preferir não receber mensagens, responda SAIR." Nas seguintes, não precisa repetir.
6. **Apresente-se.** Diga o nome da empresa; o lead pode ter salvo o número com outro nome ou nenhum.
7. **Curto.** Três a quatro linhas. Sem lista, sem PDF, sem link encurtado (parecem golpe).
8. **Nada de caixa alta, excesso de emoji ou exclamações em série.** Um emoji ocasional é aceitável.
9. **Português simples.** Escreva como a atendente falaria.

## Variáveis e o que acontece quando faltam dado

Os modelos aceitam só `{nome}`, `{servico}` e `{valor}`. Qualquer outra variável é recusada ao salvar.

| Variável | Vira | Atenção |
|---|---|---|
| `{nome}` | Primeiro nome do lead | Sempre existe |
| `{servico}` | Campo "Interesse" do lead | **Se o lead não tem interesse preenchido, a mensagem não sai** |
| `{valor}` | Valor estimado, em reais (R$ 2.800,00) | **Se o lead não tem valor, a mensagem não sai** |

Quando falta dado, o envio fica **pulado** (nunca sai texto com chaves soltas) e o motivo aparece no log: "Faltou dado do lead". Consequências práticas:

- **Não use `{valor}` em boas-vindas.** Na criação o lead ainda não tem orçamento.
- Para a boas-vindas, ou exija o campo Interesse no atendimento, ou tenha um modelo que só use `{nome}`.
- Em modelos de orçamento, confira que o valor está preenchido antes de mover o lead para a etapa de orçamento.

## Exemplos

**Boas-vindas** (5 minutos depois do cadastro)

> Oi, {nome}! Aqui é da Casa Nova Reformas. Recebi seu contato sobre {servico}. Posso te ajudar com mais detalhes? Se preferir não receber mensagens, responda SAIR.

**Follow-up 1** (24 h sem resposta)

> Oi, {nome}, tudo bem? Conseguiu ver minha mensagem sobre {servico}? Se tiver qualquer dúvida, é só falar por aqui.

**Follow-up 2** (72 h sem resposta)

> {nome}, vou deixar este contato por aqui. Se {servico} voltar a fazer sentido, é só me chamar. Obrigada!

**Orçamento sem retorno** (48 h depois do orçamento)

> Oi, {nome}! Mandei o orçamento de {valor} para {servico}. Ficou alguma dúvida que eu possa esclarecer?

**Para evitar**

| Texto | Problema |
|---|---|
| "Olá, ainda tem interesse?" | Soa como cobrança |
| "ÚLTIMA CHANCE!!! Promoção só hoje" | Parece propaganda e golpe |
| "Prezado cliente, conforme conversado…" | Formal demais, parece robô |
| "Oi {nome}, vi seu pedido de {valor}" (em boas-vindas) | `{valor}` vazio: a mensagem nem sai |

## Quem assina

A mensagem sai em nome da empresa, pelo número configurado. Se a atendente usa o nome dela no texto ("Aqui é a Camila"), todos os leads recebem esse nome, mesmo quando ela não está de plantão. Prefira o nome da empresa nos modelos automáticos.

## Quando a API oficial do WhatsApp entrar

A Meta só aceita texto livre dentro de 24 h depois da última mensagem do cliente. Fora dessa janela, e para a **primeira** mensagem, exige **modelos aprovados** previamente (RSK-08). Como funciona no Pulso:

1. Submeta cada texto à Meta como modelo, com as variáveis em posições fixas `{{1}}`, `{{2}}`…, **na mesma ordem em que aparecem no texto do Pulso**. Exemplo: o texto "Oi, {nome}! Recebi seu contato sobre {servico}" vira "Oi, {{1}}! Recebi seu contato sobre {{2}}".
2. Quando a Meta aprovar, abra o modelo em *Modelos* e preencha "Nome do modelo aprovado na Meta" (minúsculas, números e `_`, como `boas_vindas_v1`).
3. Com o nome preenchido, o Pulso envia o modelo e usa as variáveis do texto, na ordem, como parâmetros. Sem o nome, envia texto livre, que só chega dentro da janela de 24 h.

A Meta pode recusar o texto; ajuste e submeta de novo. Por isso o envio real só é ligado na fase 3 do [rollout](rollout.md).

## Revisão

- Releia as mensagens enviadas na tela *Automação* e as respostas dos leads na primeira semana de envio real.
- Mensagem que gera SAIR ou reclamação: reescreva ou desligue a regra.
