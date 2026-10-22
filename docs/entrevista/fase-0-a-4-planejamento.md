# Entrevista: Fases 0 a 4 (preparação, discovery, definição, arquitetura, protótipo)

**Objetivo:** me preparar para explicar o planejamento sem abrir o código.
**Data:** 22/10/2026 · **Status:** fechado

## Resumo

1. Escolhi o Pulso entre cinco ideias, com matriz de decisão (impacto, esforço, risco, aderência).
2. Montei um cenário, a Casa Nova Reformas, e deixei claro que é inventado.
3. Escrevi três registros de discovery simulando dono, atendente e cliente com uma IA fazendo os papéis.
4. A perda está depois do orçamento; a automação precisa ter medo de incomodar.
5. Transformei isso em RF, RNF e 17 regras de negócio numeradas.
6. Decidi nove coisas em ADRs, com trade-off e quando eu mudaria de ideia.
7. A decisão central: regras no código testável, n8n só como agendador.
8. Idempotência no banco com chave única e reserva atômica.
9. Validei os wireframes (também simulado) e recusei dois pedidos com motivo.
10. Tudo é rastreável: requisito, história, teste e tela.

## Perguntas de entrevistador

**1. Como você sabe que o problema é real, se não falou com um cliente de verdade?**
Não sei. Eu disse no próprio repositório que os registros são simulados e que os números são hipóteses. O que eu garanto é o raciocínio: separei a pergunta, a resposta e a conclusão, e deixei a evidência de cada problema apontando para o registro. Num piloto real, a primeira coisa que eu faria é medir as hipóteses M1 a M6 com dados de verdade.

**2. Por que n8n e não só código, ou só n8n?**
Só n8n deixaria regra de negócio em nós visuais, difíceis de testar e revisar. Só código com fila pediria um worker sempre ligado e não combina com hospedagem gratuita. Fiquei no meio: o app decide e executa, o n8n só dispara o ciclo. Se o n8n cai, o estado está no banco e o próximo ciclo recupera o atraso.

**3. Como você impede que o lead receba a mesma mensagem duas vezes?**
Em duas camadas no banco. Cada intenção de envio tem uma chave única (regra, lead e ciclo), então criar duas vezes não duplica. E antes de enviar eu reservo o job com um `UPDATE` condicionado a status pendente, então só uma execução concorrente consegue enviar. No caso de travar depois de reservar, eu prefiro não reenviar e pedir conferência humana.
