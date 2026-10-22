# O negócio e as personas

**Objetivo:** descrever a Casa Nova Reformas, suas dores e restrições, e as pessoas que usam o sistema.
**Data:** 22/10/2026 · **Status:** fechado
**Relacionados:** [brainstorm](01-brainstorm-e-escolha.md) · [registros de discovery](03-registro-dono.md)

> Tudo aqui é cenário que eu montei. A empresa, as pessoas e os números não existem. Onde há número, ele é uma hipótese minha, não uma medição.

## Casa Nova Reformas

Empresa de reformas e manutenção residencial (pintura, elétrica, hidráulica, pisos, pequenas obras em apartamentos e casas), com 6 pessoas: o dono, uma atendente/orçamentista e quatro profissionais de obra, entre eles um mestre de obras.

- **Origem dos leads:** Instagram, indicação de clientes antigos e anúncios pagos.
- **Atendimento:** pelo WhatsApp pessoal do dono, que passou a dividir com a atendente.
- **Orçamento:** PDF feito em editor de texto e enviado pelo WhatsApp.
- **Controle:** uma planilha com nome, telefone, serviço e uma coluna de "situação" preenchida quando dá.
- **Volume (hipótese do cenário):** algo em torno de 60 pedidos de contato por mês.

## Dores

- O lead pede orçamento, recebe o PDF e some. Ninguém sabe quando voltar a falar com ele.
- O dono está em obra e responde fora de hora. A atendente não enxerga as conversas dele.
- A planilha fica desatualizada na primeira semana.
- Não dá para saber de qual origem vêm os clientes que fecham.

## Restrições

- **Equipe pequena e sem tempo:** qualquer sistema que dê trabalho extra morre em duas semanas.
- **Orçamento baixo:** nada de ferramenta cara por usuário ou por mensagem no começo.
- **Receio de parecer robô:** o dono e a atendente têm medo de que mensagem automática afaste o cliente. O texto precisa soar como a atendente falando.
- **Número pessoal do dono:** não dá para usá-lo na API oficial do WhatsApp (ver [registro com o dono](03-registro-dono.md)).

## Personas

**Marcos, o dono (45).** Quer ver o que está parado sem abrir planilha. Usa o celular entre uma obra e outra. Quer "automatizar tudo", mas não quer perder o controle do que sai em seu nome. Usa o painel e aprova regras.

**Camila, a atendente e orçamentista (29).** É quem de fato conversa com os leads e monta orçamentos. Passa o dia no computador. Quer saber quem ela precisa chamar hoje. Teme que o sistema fale errado com um cliente. Usa quase tudo: funil, lead, tarefas, modelos.

**Seu Wagner, o mestre de obras (52), usuário eventual.** Só abre o sistema para ver a visita técnica do dia ou registrar "visitei, o cliente pediu mais um cômodo". Celular, tela pequena, pouca paciência. Precisa de uma tela de lead simples e legível no mobile.

**Renata, a cliente-tipo (38).** Quer reformar o banheiro do apartamento. Pede orçamento para três empresas. Escolhe quem respondeu rápido e não a pressionou. Se alguém insiste demais ou manda mensagem de madrugada, descarta na hora.
