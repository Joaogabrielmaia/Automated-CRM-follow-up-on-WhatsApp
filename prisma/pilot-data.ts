import type { Prisma, PrismaClient, RuleAction, RuleTrigger, StageKind } from "@prisma/client";

// Dados iniciais para um piloto de verdade: etapas, configuração, modelos e regras. Sem contas de
// demonstração e sem leads fictícios. TODAS as regras nascem desligadas (HU-07): quem liga é o Admin,
// uma por vez, na ordem do plano de rollout (docs/06-go-live/rollout.md).

const HOURS = { "0": null, "1": { start: "08:00", end: "18:00" }, "2": { start: "08:00", end: "18:00" }, "3": { start: "08:00", end: "18:00" }, "4": { start: "08:00", end: "18:00" }, "5": { start: "08:00", end: "18:00" }, "6": { start: "08:00", end: "12:00" } };

export const PILOT_STAGES: { name: string; kind: StageKind }[] = [
  { name: "Novo", kind: "OPEN" },
  { name: "Contatado", kind: "OPEN" },
  { name: "Orçamento enviado", kind: "QUOTE" },
  { name: "Negociação", kind: "OPEN" },
  { name: "Ganho", kind: "WON" },
  { name: "Perdido", kind: "LOST" },
];

// Textos de docs/06-go-live/boas-praticas-de-mensagem.md. Troque o nome da empresa na tela Modelos.
export const PILOT_TEMPLATES = [
  {
    key: "welcome",
    name: "Boas-vindas",
    body: "Oi, {nome}! Aqui é da Casa Nova Reformas. Recebi seu contato sobre {servico}. Posso te ajudar com mais detalhes? Se preferir não receber mensagens, responda SAIR.",
  },
  {
    key: "followup1",
    name: "Follow-up 1",
    body: "Oi, {nome}, tudo bem? Conseguiu ver minha mensagem sobre {servico}? Se tiver qualquer dúvida, é só falar por aqui.",
  },
  {
    key: "followup2",
    name: "Follow-up 2",
    body: "{nome}, vou deixar este contato por aqui. Se {servico} voltar a fazer sentido, é só me chamar. Obrigada!",
  },
  {
    key: "quote",
    name: "Orçamento sem retorno",
    body: "Oi, {nome}! Mandei o orçamento de {valor} para {servico}. Ficou alguma dúvida que eu possa esclarecer?",
  },
] as const;

interface PilotRule {
  name: string;
  trigger: RuleTrigger;
  afterMinutes: number;
  action: RuleAction;
  template?: (typeof PILOT_TEMPLATES)[number]["key"];
  taskTitle?: string;
  lostReason?: string;
}

const H = 60;
export const PILOT_RULES: PilotRule[] = [
  // Fase 1 do rollout: só lembretes para a atendente, sem falar com o lead.
  { name: "[Fase 1] Responder lead novo", trigger: "NEW_LEAD", afterMinutes: 5, action: "CREATE_TASK", taskTitle: "Responder {nome}" },
  { name: "[Fase 1] Cobrar orçamento", trigger: "QUOTE_NO_RETURN", afterMinutes: 48 * H, action: "CREATE_TASK", taskTitle: "Cobrar retorno de {nome}" },
  { name: "[Fase 1] Retomar contato", trigger: "NO_REPLY", afterMinutes: 24 * H, action: "CREATE_TASK", taskTitle: "Retomar contato com {nome}" },
  // Fase 3: mensagens de verdade. Só depois de os pré-requisitos do envio real estarem prontos.
  { name: "[Fase 3] Boas-vindas", trigger: "NEW_LEAD", afterMinutes: 5, action: "SEND_MESSAGE", template: "welcome" },
  { name: "[Fase 3] Follow-up 1 (24h)", trigger: "NO_REPLY", afterMinutes: 24 * H, action: "SEND_MESSAGE", template: "followup1" },
  { name: "[Fase 3] Follow-up 2 (72h)", trigger: "NO_REPLY", afterMinutes: 72 * H, action: "SEND_MESSAGE", template: "followup2" },
  { name: "[Fase 3] Orçamento sem retorno (48h)", trigger: "QUOTE_NO_RETURN", afterMinutes: 48 * H, action: "SEND_MESSAGE", template: "quote" },
  {
    name: "[Fase 3] Perdido sem resposta (120h)",
    trigger: "NO_REPLY",
    afterMinutes: 120 * H,
    action: "MOVE_TO_LOST",
    lostReason: "Sem resposta após follow-ups",
  },
];

// Idempotente: se já existe etapa, não faz nada. Devolve se criou.
export async function seedPilotData(prisma: PrismaClient): Promise<{ created: boolean }> {
  if ((await prisma.stage.count()) > 0) return { created: false };

  await prisma.$transaction(async (tx) => {
    await tx.stage.createMany({ data: PILOT_STAGES.map((s, position) => ({ ...s, position })) });
    await tx.setting.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, businessHours: HOURS as Prisma.InputJsonValue, maxMessagesPerCycle: 3, minGapMinutes: 720 },
    });

    const templateIds = new Map<string, string>();
    for (const t of PILOT_TEMPLATES) {
      const row = await tx.messageTemplate.create({ data: { name: t.name, body: t.body } });
      templateIds.set(t.key, row.id);
    }
    for (const r of PILOT_RULES) {
      await tx.automationRule.create({
        data: {
          name: r.name,
          trigger: r.trigger,
          afterMinutes: r.afterMinutes,
          action: r.action,
          templateId: r.template ? templateIds.get(r.template) : null,
          taskTitle: r.taskTitle ?? null,
          lostReason: r.lostReason ?? null,
          active: false,
          activatedAt: null,
        },
      });
    }
  });
  return { created: true };
}
