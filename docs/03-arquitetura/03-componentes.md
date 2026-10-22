# Diagrama de componentes

**Objetivo:** mostrar as peças do sistema e onde cada responsabilidade mora.
**Data:** 22/10/2026 · **Status:** vigente
**Relacionados:** [ADR-001](adr/ADR-001-n8n-ou-jobs-em-codigo.md) · [ADR-002](adr/ADR-002-provedor-de-mensagens.md)

```mermaid
flowchart LR
    subgraph Usuarios[Pessoas]
        AT[Atendente]
        AD[Admin / dono]
    end

    subgraph App[App Next.js]
        UI[Páginas e componentes]
        ACT[Server Actions]
        API[Rotas: tick, webhook, health]
        SRV[src/lib/services<br/>regras de acesso e CRUD]
        ENG[src/lib/automation<br/>motor do ciclo]
        RUL[src/lib/rules<br/>funções puras]
        PRV[src/lib/providers<br/>MessageProvider]
    end

    DB[(PostgreSQL)]
    N8N[n8n]
    WA[WhatsApp Cloud API]
    SIM[SimulatedProvider]

    AT --> UI
    AD --> UI
    UI --> ACT --> SRV --> DB
    API --> ENG
    API --> SRV
    N8N -- "POST tick a cada 5 min" --> API
    WA -. "resposta do lead" .-> API
    N8N -. "encaminha resposta assinada" .-> API
    ENG --> RUL
    ENG --> DB
    ENG --> PRV
    PRV --> SIM
    PRV -. "MESSAGE_PROVIDER=whatsapp-cloud" .-> WA
```

## Camadas e regra de dependência

- **`rules`**: funções puras (horário comercial, opt-out, modelo, backoff, assinatura, telefone, "o que está devido"). Não importam banco nem relógio.
- **`automation`** e **`services`**: usam o banco e as funções puras. Todo serviço recebe o `actor` e confere permissão.
- **Actions e rotas**: só leem a sessão, validam com Zod e chamam um serviço. Nenhuma regra de negócio mora aqui.
- **`providers`**: o único lugar que conhece o WhatsApp.
