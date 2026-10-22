import { beforeEach, describe, expect, it } from "vitest";
import { POST as tick } from "@/app/api/automation/tick/route";
import type { SessionUser } from "@/lib/auth/permissions";
import { AppError } from "@/lib/errors";
import { anonymizeLead, createLead, removeOptOut, setPaused } from "@/lib/services/leads";
import { saveRule, setRuleActive } from "@/lib/services/rules";
import { updateSettings } from "@/lib/services/settings";
import { createStage } from "@/lib/services/stages";
import { saveTemplate } from "@/lib/services/templates";
import { baseWorld, makeLead, makeRule, MON_10H, prisma, resetDb } from "./helpers";

// RNF-03: a conferência de papel acontece no servidor, em cada serviço. Sumir com o botão na tela não conta.
let admin: SessionUser;
let attendant: SessionUser;
let stageId: string;

beforeEach(async () => {
  await resetDb();
  const world = await baseWorld();
  stageId = world.stages.open.id;
  attendant = { id: world.user.id, name: world.user.name, email: world.user.email, role: "ATTENDANT" };
  const owner = await prisma.user.create({
    data: { name: "Marcos Dono", email: "dono@teste.dev", passwordHash: "x", role: "ADMIN" },
  });
  admin = { id: owner.id, name: owner.name, email: owner.email, role: "ADMIN" };
});

const forbiddenError = expect.objectContaining({ name: "AppError", code: "FORBIDDEN" });

describe("o que a atendente não pode fazer", () => {
  it("não cria nem ativa regras", async () => {
    const rule = await makeRule({ name: "Boas-vindas", trigger: "NEW_LEAD", afterMinutes: 5 });
    await expect(
      saveRule(attendant, { name: "Nova regra", trigger: "NEW_LEAD", afterMinutes: 5, action: "CREATE_TASK", taskTitle: "Ligar" }),
    ).rejects.toEqual(forbiddenError);
    await expect(setRuleActive(attendant, rule.id, false)).rejects.toEqual(forbiddenError);
    expect((await prisma.automationRule.findUniqueOrThrow({ where: { id: rule.id } })).active).toBe(true);
  });

  it("não altera configurações nem etapas do funil", async () => {
    await expect(
      updateSettings(attendant, { businessHours: { "1": { start: "00:00", end: "23:59" } }, maxMessagesPerCycle: 10, minGapHours: 1 }),
    ).rejects.toEqual(forbiddenError);
    await expect(createStage(attendant, { name: "Nova etapa", kind: "OPEN" })).rejects.toEqual(forbiddenError);
    expect((await prisma.setting.findUniqueOrThrow({ where: { id: 1 } })).maxMessagesPerCycle).toBe(3);
  });

  it("não remove opt-out nem anonimiza lead", async () => {
    const lead = await makeLead({ stageId, createdAt: MON_10H, optedOutAt: MON_10H });
    await expect(removeOptOut(attendant, lead.id)).rejects.toEqual(forbiddenError);
    await expect(anonymizeLead(attendant, lead.id)).rejects.toEqual(forbiddenError);
    const after = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(after.optedOutAt).not.toBeNull();
    expect(after.anonymizedAt).toBeNull();
  });
});

describe("o que a atendente pode fazer", () => {
  it("cadastra lead, pausa automação e edita modelos", async () => {
    const lead = await createLead(attendant, { name: "Ana Paula", phone: "(31) 99999-0101", source: "Site" });
    await expect(setPaused(attendant, lead.id, true)).resolves.toBeUndefined();
    await expect(saveTemplate(attendant, { name: "Modelo", body: "Oi, {nome}!" })).resolves.toBeDefined();
  });
});

describe("o que só o dono pode fazer", () => {
  it("cria regra, ativa guardando o instante e altera configurações", async () => {
    const rule = await saveRule(admin, { name: "Nova regra", trigger: "NEW_LEAD", afterMinutes: 5, action: "CREATE_TASK", taskTitle: "Ligar" });
    expect(rule.active).toBe(false);
    const activated = await setRuleActive(admin, rule.id, true, MON_10H);
    expect(activated).toMatchObject({ active: true, activatedAt: MON_10H });

    await updateSettings(admin, { businessHours: { "1": { start: "09:00", end: "17:00" } }, maxMessagesPerCycle: 2, minGapHours: 24 });
    expect(await prisma.setting.findUniqueOrThrow({ where: { id: 1 } })).toMatchObject({ maxMessagesPerCycle: 2, minGapMinutes: 1440 });
  });

  it("remove o opt-out e anonimiza o lead", async () => {
    const lead = await makeLead({ stageId, createdAt: MON_10H, optedOutAt: MON_10H });
    await removeOptOut(admin, lead.id);
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } })).optedOutAt).toBeNull();

    await anonymizeLead(admin, lead.id);
    const after = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(after.name).toBe("Lead anonimizado");
    expect(after.anonymizedAt).not.toBeNull();
    expect(after.phone).not.toContain("9999");
  });
});

describe("rota do ciclo de automação", () => {
  const call = (secret: string | null) =>
    tick(
      new Request("http://localhost/api/automation/tick", {
        method: "POST",
        headers: secret ? { "x-automation-secret": secret } : {},
      }),
    );

  it("sem o segredo compartilhado responde 401 e não executa nada", async () => {
    expect((await call(null)).status).toBe(401);
    expect((await call("segredo-errado")).status).toBe(401);
    expect(await prisma.automationRun.count()).toBe(0);
  });

  it("com o segredo certo executa um ciclo", async () => {
    const response = await call(process.env.AUTOMATION_SECRET!);
    expect(response.status).toBe(200);
    expect(await prisma.automationRun.count()).toBe(1);
  });
});

describe("erros de autorização", () => {
  it("são AppError com código FORBIDDEN, que a tela mostra como mensagem", async () => {
    const error = await saveRule(attendant, { name: "x", trigger: "NEW_LEAD", afterMinutes: 1, action: "CREATE_TASK", taskTitle: "t" }).catch((e) => e);
    expect(error).toBeInstanceOf(AppError);
    expect(error.message).toMatch(/permissão/);
  });
});
