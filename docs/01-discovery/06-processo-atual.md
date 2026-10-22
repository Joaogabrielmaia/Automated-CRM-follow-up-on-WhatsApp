# Processo atual (AS-IS)

**Objetivo:** mostrar como o lead anda hoje e onde ele se perde.
**Data:** 22/10/2026 · **Status:** fechado
**Relacionados:** [problemas priorizados](07-problemas-priorizados.md) · [registro da atendente](04-registro-atendente.md)

Montei este fluxo a partir dos [registros simulados](04-registro-atendente.md). Os blocos em vermelho são onde o lead esfria.

```mermaid
flowchart TD
    A[Lead chega por Instagram, indicação ou anúncio] --> B[Mensagem cai no WhatsApp pessoal do dono]
    B --> C{Dono vê a mensagem em até 2h?}
    C -- sim --> D[Dono ou atendente responde]
    C -- não --> X1[PERDA 1: lead espera, fim de semana ou obra]
    D --> E[Atendente anota na planilha, quando lembra]
    E --> F[Visita técnica ou conversa para entender a obra]
    F --> G[Atendente monta o orçamento em PDF]
    G --> H[Envia o PDF pelo WhatsApp]
    H --> I{Cliente respondeu?}
    I -- sim --> J[Negociação e fechamento]
    I -- não --> K[Anota no caderninho para chamar depois]
    K --> L{Lembrou de chamar?}
    L -- sim, tarde --> M[Mensagem de cobrança improvisada]
    L -- não --> X2[PERDA 2: orçamento esquecido]
    M --> I
    J --> N[Ganho ou perdido, sem registro do motivo]
    N --> X3[PERDA 3: ninguém aprende com os perdidos]

    style X1 fill:#fde2e2,stroke:#c0392b
    style X2 fill:#fde2e2,stroke:#c0392b
    style X3 fill:#fde2e2,stroke:#c0392b
```

## Onde o lead se perde

| Ponto | O que acontece | Quem sofre |
|---|---|---|
| Perda 1 | Primeira resposta demora, principalmente à noite e fim de semana | Lead e dono |
| Perda 2 | Orçamento enviado e esquecido; o "chamar depois" vive num caderninho | Atendente |
| Perda 3 | Motivo de perda não é anotado, a empresa não aprende | Dono |
| Transversal | Planilha desatualizada, sem origem do lead nem histórico | Todos |
