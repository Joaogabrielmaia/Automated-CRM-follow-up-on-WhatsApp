# ADR-010: sem `loading.tsx`; feedback de carregamento por indicador

**Objetivo:** decidir como mostrar "carregando" sem quebrar a atualização da tela depois de uma ação.
**Data:** 23/10/2026 · **Status:** aceita
**Relacionados:** [RNF-05](../../02-definicao/02-requisitos.md) · [qualidade](../../05-qualidade/README.md)

## Contexto

O Definition of Done pede estados de carregamento, vazio e erro. A primeira versão tinha um `src/app/(app)/loading.tsx`, o jeito padrão do Next para mostrar um esqueleto enquanto a página carrega.

Ao passar a rodar o E2E contra o **build de produção** (e não só `next dev`), três testes passaram a falhar de forma intermitente. A ação rodava no servidor (o dado mudava no banco), mas a tela não mostrava o resultado:

- botões ficavam em "Salvando…" para sempre;
- o selo Ativa/Inativa de uma regra não mudava depois do clique;
- mensagens de sucesso e de erro não apareciam.

O servidor respondia em cerca de 70 a 150 ms com status 200 e o payload completo. Quem não concluía era o cliente.

## O que eu medi

Dois scripts repetiram a mesma ação contra o servidor de produção (`next build` + `next start`), contando quantas vezes a tela não atualizava:

| Situação | Simulador: ação presa em "Salvando…" | Regra: selo não atualizou |
|---|---|---|
| Com `loading.tsx` e prefetch dos links ligado (estado original) | 4 em 25 | não medi |
| Com `loading.tsx`, `revalidatePath` removido da ação | 0 em 30 | não aplicável |
| Com `loading.tsx`, prefetch desligado | 3 em 40 (e 2 em 40 numa repetição) | 5 em 40 |
| **Sem `loading.tsx`**, prefetch desligado | **0 em 60** (e 0 em 40) | **0 em 60** (e 0 em 40) |

Tabela do autor; resultado bruto não arquivado.

Conclusões: o prefetch não era a causa; o gatilho é o `revalidatePath` somado à fronteira de Suspense que o `loading.tsx` cria em volta das páginas. Não aprofundei o mecanismo interno do Next 15.5.28; o que fica registrado é a medição, não uma explicação do framework.

## Decisão

1. **Remover `src/app/(app)/loading.tsx`.**
2. **Feedback de navegação por indicador no link**, com `useLinkStatus` (um ponto pulsante e o texto "carregando…" para leitor de tela no item do menu que está carregando).
3. **Feedback de ação já existente:** o botão do formulário vira "Salvando…" enquanto a ação roda, e o resultado aparece em `role="status"` ou `role="alert"`.
4. Os links internos também ficam com `prefetch={false}`. Isso não resolvia o travamento, mas cada carregamento de página disparava de 8 a 16 requisições de prefetch, cada uma consultando o banco. Num app pequeno com banco gratuito, é custo sem benefício.
5. Tela de erro (`error.tsx`) e estados vazios continuam como estavam; não usam Suspense.

## Trade-off

Ao navegar para uma página lenta, o conteúdo antigo continua visível até o novo ficar pronto; só o ponto no menu indica que algo está acontecendo. É menos elegante que um esqueleto, mas as páginas do Pulso fazem poucas consultas e respondem em dezenas de milissegundos.

## Quando eu mudaria de ideia

Se uma versão do Next corrigir o problema (eu repetiria os dois scripts de medição antes de voltar com o `loading.tsx`), ou se alguma página passar a demorar o bastante para precisar de esqueleto. Nesse caso, eu colocaria o `Suspense` só em volta do trecho lento, não da página inteira, e repetiria a medição.

## Como repetir a medição

O E2E (`npm run test:e2e`) já cobre o caso: ele clica em ações e espera o resultado na tela. Um travamento volta a aparecer como falha intermitente nos testes de regras, funil, simulador ou importação.
