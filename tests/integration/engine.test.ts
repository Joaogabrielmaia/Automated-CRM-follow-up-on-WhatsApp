import { beforeEach, describe, expect, it, vi } from "vitest";
import { runAutomationCycle } from "@/lib/automation/engine";
import { setRuleActive } from "@/lib/services/rules";
import { SimulatedProvider } from "@/lib/providers/simulated";
import type { MessageProvider } from "@/lib/providers";
import { addMinutes, at, baseWorld, jobsOf, makeLead, makeRule, MON_10H, nextPhone, prisma, resetDb } from "./helpers";

let world: Awaited<ReturnType<typeof baseWorld>>;

beforeEach(async () => {
  await resetDb();
  world = await baseWorld();
});

const stageId = () => world.stages.open.id;

describe("boas-vindas (RN-12) e idempotência (RN-05)", () => {
  it("envia uma vez e não duplica ao rodar o ciclo de novo", async () => {
    await makeRule({ name: "Boas-vindas", trigger: "NEW_LEAD", afterMinutes: 5 });
    const lead = await makeLead({ stageId: stageId(), createdAt: MON_10H });

    const early = await runAutomationCycle(addMinutes(MON_10H, 2));
    expect(early.created).toBe(0);

    const first = await runAutomationCycle(addMinutes(MON_10H, 6));
    expect(first).toMatchObject({ created: 1, sent: 1 });

    const again = await runAutomationCycle(addMinutes(MON_10H, 12));
    expect(again).toMatchObject({ created: 0, sent: 0 });

    expect(await jobsOf(lead.id)).toHaveLength(1);
    const updated = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(updated.cycleStartedAt).toEqual(addMinutes(MON_10H, 6));
    expect(await prisma.interaction.count({ where: { leadId: lead.id, type: "MESSAGE_OUT" } })).toBe(1);
  });

  it("dois ciclos simultâneos enviam a mensagem uma única vez (ADR-003)", async () => {
    await makeRule({ name: "Boas-vindas", trigger: "NEW_LEAD", afterMinutes: 5 });
    await makeLead({ stageId: stageId(), createdAt: MON_10H });
    const send = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 50));
      return { providerMessageId: "x" };
    });
    const provider: MessageProvider = { name: "contador", send };

    const now = addMinutes(MON_10H, 6);
    await Promise.all([runAutomationCycle(now, { provider }), runAutomationCycle(now, { provider })]);

    expect(send).toHaveBeenCalledTimes(1);
  });
});

describe("regra nova não age sobre o passado (RN-17)", () => {
  it("lead criado antes da ativação da regra não gera mensagem", async () => {
    await makeRule({ name: "Boas-vindas", trigger: "NEW_LEAD", afterMinutes: 5, activatedAt: addMinutes(MON_10H, 60) });
    await makeLead({ stageId: stageId(), createdAt: MON_10H });

    const summary = await runAutomationCycle(addMinutes(MON_10H, 120));
    expect(summary).toMatchObject({ created: 0, sent: 0 });
  });
});

describe("horário comercial (RN-01, RN-02)", () => {
  it("lead criado à noite espera a abertura da janela e sai de manhã", async () => {
    await makeRule({ name: "Boas-vindas", trigger: "NEW_LEAD", afterMinutes: 5 });
    // Segunda 20:00 local = 23:00Z.
    const created = at("2026-10-19T23:00:00Z");
    const lead = await makeLead({ stageId: stageId(), createdAt: created });

    const night = await runAutomationCycle(at("2026-10-19T23:10:00Z"));
    expect(night).toMatchObject({ created: 1, sent: 0 });
    const [job] = await jobsOf(lead.id);
    expect(job.status).toBe("PENDING");
    // Terça 08:00 local = 11:00Z.
    expect(job.scheduledFor).toEqual(at("2026-10-20T11:00:00Z"));

    const morning = await runAutomationCycle(at("2026-10-20T11:00:00Z"));
    expect(morning.sent).toBe(1);
  });
});

describe("sequência sem resposta (RN-06, RN-07, RN-08)", () => {
  it("boas-vindas, follow-up 1 (24h), follow-up 2 (72h) e Perdido (120h)", async () => {
    await makeRule({ name: "Boas-vindas", trigger: "NEW_LEAD", afterMinutes: 5 });
    await makeRule({ name: "Follow-up 1", trigger: "NO_REPLY", afterMinutes: 24 * 60 });
    await makeRule({ name: "Follow-up 2", trigger: "NO_REPLY", afterMinutes: 72 * 60 });
    await makeRule({
      name: "Perdido",
      trigger: "NO_REPLY",
      afterMinutes: 120 * 60,
      action: "MOVE_TO_LOST",
      lostReason: "Sem resposta após follow-ups",
    });
    const lead = await makeLead({ stageId: stageId(), createdAt: MON_10H });

    const t0 = addMinutes(MON_10H, 5);
    expect((await runAutomationCycle(t0)).sent).toBe(1);
    expect((await runAutomationCycle(addMinutes(t0, 24 * 60))).sent).toBe(1); // terça 10:05
    expect((await runAutomationCycle(addMinutes(t0, 72 * 60))).sent).toBe(1); // quinta 10:05
    const last = await runAutomationCycle(addMinutes(t0, 120 * 60)); // sábado 10:05
    expect(last.sent).toBe(0);

    const updated = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id }, include: { stage: true } });
    expect(updated.stage.kind).toBe("LOST");
    expect(updated.lostReason).toBe("Sem resposta após follow-ups");
    expect(await prisma.automationJob.count({ where: { leadId: lead.id, status: "SENT" } })).toBe(3);
  });

  it("limite de mensagens por ciclo pula a excedente e registra o motivo (RN-06)", async () => {
    await prisma.setting.update({ where: { id: 1 }, data: { maxMessagesPerCycle: 1, minGapMinutes: 0 } });
    await makeRule({ name: "Boas-vindas", trigger: "NEW_LEAD", afterMinutes: 5 });
    await makeRule({ name: "Follow-up 1", trigger: "NO_REPLY", afterMinutes: 60 });
    const lead = await makeLead({ stageId: stageId(), createdAt: MON_10H });

    await runAutomationCycle(addMinutes(MON_10H, 5));
    const summary = await runAutomationCycle(addMinutes(MON_10H, 5 + 60));
    expect(summary).toMatchObject({ sent: 0, skipped: 1 });
    const skipped = (await jobsOf(lead.id)).find((j) => j.status === "SKIPPED");
    expect(skipped?.reason).toBe("LIMIT_REACHED");
  });
});

describe("intervalo mínimo entre mensagens (RN-18)", () => {
  it("segunda mensagem vencida logo após a primeira é adiada em pelo menos 12h", async () => {
    await makeRule({ name: "Boas-vindas", trigger: "NEW_LEAD", afterMinutes: 5 });
    await makeRule({ name: "Follow-up rápido", trigger: "NO_REPLY", afterMinutes: 10 });
    const lead = await makeLead({ stageId: stageId(), createdAt: MON_10H });

    const sentAt = addMinutes(MON_10H, 5);
    await runAutomationCycle(sentAt);
    const summary = await runAutomationCycle(addMinutes(sentAt, 20));
    expect(summary).toMatchObject({ sent: 0, rescheduled: 1 });

    const pending = (await jobsOf(lead.id)).find((j) => j.status === "PENDING");
    expect(pending?.reason).toBe("MIN_GAP");
    expect(pending!.scheduledFor.getTime()).toBeGreaterThanOrEqual(addMinutes(sentAt, 12 * 60).getTime());
  });
});

describe("falhas do provedor (RN-11)", () => {
  const provider = new SimulatedProvider();

  it("falha só na primeira tentativa: reagenda em 1 min e envia na segunda", async () => {
    await makeRule({ name: "Boas-vindas", trigger: "NEW_LEAD", afterMinutes: 5 });
    const lead = await makeLead({ stageId: stageId(), createdAt: MON_10H, phone: nextPhone("0001") });

    const t = addMinutes(MON_10H, 5);
    expect(await runAutomationCycle(t, { provider })).toMatchObject({ sent: 0, rescheduled: 1 });
    expect(await runAutomationCycle(addMinutes(t, 1), { provider })).toMatchObject({ sent: 1 });
    const [job] = await jobsOf(lead.id);
    expect(job).toMatchObject({ status: "SENT", attempts: 2 });
  });

  it("falha sempre: 4 tentativas, depois FAILED e tarefa para a atendente", async () => {
    await makeRule({ name: "Boas-vindas", trigger: "NEW_LEAD", afterMinutes: 5 });
    const lead = await makeLead({
      stageId: stageId(),
      createdAt: MON_10H,
      phone: nextPhone("0000"),
      ownerId: world.user.id,
    });

    let t = addMinutes(MON_10H, 5);
    for (const wait of [0, 1, 5, 15]) {
      t = addMinutes(t, wait);
      await runAutomationCycle(t, { provider });
    }
    const [job] = await jobsOf(lead.id);
    expect(job).toMatchObject({ status: "FAILED", attempts: 4, reason: "RETRIES_EXHAUSTED" });
    const tasks = await prisma.task.findMany({ where: { leadId: lead.id } });
    expect(tasks).toHaveLength(1);
    expect(tasks[0].assigneeId).toBe(world.user.id);
  });

  it("erro definitivo não tenta de novo", async () => {
    await makeRule({ name: "Boas-vindas", trigger: "NEW_LEAD", afterMinutes: 5 });
    const lead = await makeLead({ stageId: stageId(), createdAt: MON_10H, phone: nextPhone("9999") });

    await runAutomationCycle(addMinutes(MON_10H, 5), { provider });
    const [job] = await jobsOf(lead.id);
    expect(job).toMatchObject({ status: "FAILED", attempts: 1, reason: "PERMANENT_ERROR" });
  });

  it("job travado em SENDING vira FAILED sem reenviar e avisa a atendente (ADR-003)", async () => {
    const rule = await makeRule({ name: "Boas-vindas", trigger: "NEW_LEAD", afterMinutes: 5 });
    const lead = await makeLead({ stageId: stageId(), createdAt: MON_10H, ownerId: world.user.id });
    const old = new Date(Date.now() - 30 * 60_000);
    await prisma.automationJob.create({
      data: {
        idempotencyKey: `${rule.id}:${lead.id}:travado`,
        leadId: lead.id,
        ruleId: rule.id,
        status: "SENDING",
        scheduledFor: old,
        updatedAt: old,
      },
    });
    const send = vi.fn(async () => ({ providerMessageId: "x" }));

    await runAutomationCycle(new Date(), { provider: { name: "contador", send } });

    const stuck = (await jobsOf(lead.id)).find((j) => j.idempotencyKey.endsWith("travado"));
    expect(stuck).toMatchObject({ status: "FAILED", reason: "UNCERTAIN_STATE" });
    expect(await prisma.task.count({ where: { leadId: lead.id } })).toBe(1);
  });
});

describe("travas de estado (RN-09, RN-10, RN-14)", () => {
  it("lead movido para Perdido depois do job criado tem o envio cancelado", async () => {
    await makeRule({ name: "Boas-vindas", trigger: "NEW_LEAD", afterMinutes: 5 });
    const created = at("2026-10-19T23:00:00Z"); // fora do horário: job fica PENDING
    const lead = await makeLead({ stageId: stageId(), createdAt: created });
    await runAutomationCycle(at("2026-10-19T23:10:00Z"));

    await prisma.lead.update({ where: { id: lead.id }, data: { stageId: world.stages.lost.id } });
    const summary = await runAutomationCycle(at("2026-10-20T11:00:00Z"));
    expect(summary).toMatchObject({ sent: 0, canceled: 1 });
    expect((await jobsOf(lead.id))[0]).toMatchObject({ status: "CANCELED", reason: "STAGE_CLOSED" });
  });

  it("lead pausado não recebe nada", async () => {
    await makeRule({ name: "Boas-vindas", trigger: "NEW_LEAD", afterMinutes: 5 });
    await makeLead({ stageId: stageId(), createdAt: MON_10H, automationPaused: true });
    expect(await runAutomationCycle(addMinutes(MON_10H, 10))).toMatchObject({ created: 0, sent: 0 });
  });

  it("modelo com {valor} e lead sem valor fica pulado, sem texto com chaves soltas", async () => {
    await makeRule({ name: "Boas-vindas", trigger: "NEW_LEAD", afterMinutes: 5, body: "Oi {nome}, seu orçamento: {valor}" });
    const lead = await makeLead({ stageId: stageId(), createdAt: MON_10H });

    const summary = await runAutomationCycle(addMinutes(MON_10H, 6));
    expect(summary).toMatchObject({ sent: 0, skipped: 1 });
    expect((await jobsOf(lead.id))[0].reason).toBe("MISSING_VARIABLE:valor");
    expect(await prisma.interaction.count({ where: { leadId: lead.id, type: "MESSAGE_OUT" } })).toBe(0);
  });
});

describe("orçamento sem retorno (RN-15)", () => {
  it("após 48h na etapa de orçamento cria a tarefa e envia a mensagem", async () => {
    await makeRule({ name: "Orçamento: mensagem", trigger: "QUOTE_NO_RETURN", afterMinutes: 48 * 60, body: "Oi {nome}, viu o orçamento de {valor}?" });
    await makeRule({
      name: "Orçamento: tarefa",
      trigger: "QUOTE_NO_RETURN",
      afterMinutes: 48 * 60,
      action: "CREATE_TASK",
      taskTitle: "Cobrar retorno de {nome}",
    });
    const lead = await makeLead({
      stageId: world.stages.quote.id,
      createdAt: addMinutes(MON_10H, -60),
      stageChangedAt: MON_10H,
      estimatedValue: "2800.00",
      ownerId: world.user.id,
    });

    expect(await runAutomationCycle(addMinutes(MON_10H, 47 * 60))).toMatchObject({ created: 0 });
    const summary = await runAutomationCycle(addMinutes(MON_10H, 48 * 60));
    expect(summary).toMatchObject({ created: 2, sent: 1 });

    const task = await prisma.task.findFirstOrThrow({ where: { leadId: lead.id } });
    expect(task.title).toBe("Cobrar retorno de Ana");
    const message = await prisma.interaction.findFirstOrThrow({ where: { leadId: lead.id, type: "MESSAGE_OUT" } });
    expect(message.body).toContain("R$");
    expect(message.body).not.toContain("{");
  });
});

describe("regra desativada (HU-07)", () => {
  it("desativar pela tela cancela na hora o que a regra tinha na fila", async () => {
    const rule = await makeRule({ name: "Boas-vindas", trigger: "NEW_LEAD", afterMinutes: 5 });
    const lead = await makeLead({ stageId: stageId(), createdAt: at("2026-10-19T23:00:00Z") }); // fora do horário
    await runAutomationCycle(at("2026-10-19T23:10:00Z"));
    expect((await jobsOf(lead.id))[0].status).toBe("PENDING");

    const admin = { id: world.user.id, name: "Admin", email: "a@teste.dev", role: "ADMIN" as const };
    await setRuleActive(admin, rule.id, false, at("2026-10-19T23:20:00Z"));

    expect((await jobsOf(lead.id))[0]).toMatchObject({ status: "CANCELED", reason: "RULE_INACTIVE" });
    const summary = await runAutomationCycle(at("2026-10-20T11:00:00Z"));
    expect(summary.sent).toBe(0);
  });

  it("job pendente de regra desligada por fora (ex.: direto no banco) também não sai", async () => {
    const rule = await makeRule({ name: "Boas-vindas", trigger: "NEW_LEAD", afterMinutes: 5 });
    const lead = await makeLead({ stageId: stageId(), createdAt: MON_10H });
    await prisma.automationJob.create({
      data: { idempotencyKey: `${rule.id}:${lead.id}:x`, leadId: lead.id, ruleId: rule.id, scheduledFor: MON_10H },
    });
    await prisma.automationRule.update({ where: { id: rule.id }, data: { active: false } });

    const summary = await runAutomationCycle(addMinutes(MON_10H, 10));
    expect(summary).toMatchObject({ sent: 0, canceled: 1 });
    expect((await jobsOf(lead.id))[0].reason).toBe("RULE_INACTIVE");
  });
});

describe("agendador parado (modos de falha)", () => {
  it("job que roda muito depois do previsto deixa o registro Atrasado no log", async () => {
    await makeRule({ name: "Boas-vindas", trigger: "NEW_LEAD", afterMinutes: 5 });
    const lead = await makeLead({ stageId: stageId(), createdAt: MON_10H });

    // O n8n ficou parado: o ciclo só volta 1h30 depois do previsto, ainda dentro do horário comercial.
    const summary = await runAutomationCycle(addMinutes(MON_10H, 95));
    expect(summary.sent).toBe(1);
    const late = await prisma.automationLog.findMany({ where: { leadId: lead.id, event: "JOB_LATE" } });
    expect(late).toHaveLength(1);
    expect(late[0].detail).toMatch(/Venceu há 90 min/);
  });

  it("job no horário não gera registro de atraso", async () => {
    await makeRule({ name: "Boas-vindas", trigger: "NEW_LEAD", afterMinutes: 5 });
    const lead = await makeLead({ stageId: stageId(), createdAt: MON_10H });
    await runAutomationCycle(addMinutes(MON_10H, 6));
    expect(await prisma.automationLog.count({ where: { leadId: lead.id, event: "JOB_LATE" } })).toBe(0);
  });
});

describe("modelo aprovado na Meta (RSK-08)", () => {
  const capture = () => {
    const sent: Parameters<MessageProvider["send"]>[0][] = [];
    const provider: MessageProvider = {
      name: "captura",
      send: async (input) => {
        sent.push(input);
        return { providerMessageId: "x" };
      },
    };
    return { sent, provider };
  };

  it("com nome do modelo aprovado, as variáveis viram parâmetros na ordem do texto", async () => {
    const rule = await makeRule({ name: "Boas-vindas", trigger: "NEW_LEAD", afterMinutes: 5, body: "Oi {nome}, sobre {servico}" });
    await prisma.messageTemplate.update({ where: { id: rule.templateId! }, data: { whatsappTemplateName: "boas_vindas_v1" } });
    await makeLead({ stageId: stageId(), createdAt: MON_10H, name: "Ana Paula", interest: "Reforma de banheiro" });
    const { sent, provider } = capture();

    const summary = await runAutomationCycle(addMinutes(MON_10H, 6), { provider });
    expect(summary.sent).toBe(1);
    expect(sent[0].template).toEqual({ name: "boas_vindas_v1", language: "pt_BR", parameters: ["Ana", "Reforma de banheiro"] });
    expect(sent[0].body).toBe("Oi Ana, sobre Reforma de banheiro");
  });

  it("sem nome do modelo aprovado, segue texto livre", async () => {
    await makeRule({ name: "Boas-vindas", trigger: "NEW_LEAD", afterMinutes: 5 });
    await makeLead({ stageId: stageId(), createdAt: MON_10H });
    const { sent, provider } = capture();
    await runAutomationCycle(addMinutes(MON_10H, 6), { provider });
    expect(sent[0].template).toBeUndefined();
  });
});
