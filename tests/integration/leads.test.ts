import { beforeEach, describe, expect, it } from "vitest";
import type { SessionUser } from "@/lib/auth/permissions";
import { runAutomationCycle } from "@/lib/automation/engine";
import { createLead, getLeadDetail, listBoard, moveLead, registerManualContact, setPaused, updateLead } from "@/lib/services/leads";
import { createStage, deleteStage, moveStage, updateStage } from "@/lib/services/stages";
import { deleteTemplate, saveTemplate } from "@/lib/services/templates";
import { saveRule, deleteRule } from "@/lib/services/rules";
import { addMinutes, at, baseWorld, jobsOf, makeLead, makeRule, MON_10H, prisma, resetDb } from "./helpers";

let world: Awaited<ReturnType<typeof baseWorld>>;
let admin: SessionUser;

beforeEach(async () => {
  await resetDb();
  world = await baseWorld();
  const owner = await prisma.user.create({
    data: { name: "Marcos Dono", email: "dono@teste.dev", passwordHash: "x", role: "ADMIN" },
  });
  admin = { id: owner.id, name: owner.name, email: owner.email, role: "ADMIN" };
});

describe("cadastro de lead (RF-02, RN-13)", () => {
  it("normaliza o telefone, entra na primeira etapa aberta e registra histórico", async () => {
    const lead = await createLead(admin, { name: "Ana Paula", phone: "(31) 99999-0101", source: "Instagram" }, MON_10H);
    expect(lead.phone).toBe("+5531999990101");
    expect(lead.stageId).toBe(world.stages.open.id);
    expect(lead.ownerId).toBe(admin.id);
    expect(await prisma.stageHistory.count({ where: { leadId: lead.id } })).toBe(1);
  });

  it("recusa telefone inválido e telefone repetido, mesmo escrito de outro jeito", async () => {
    await createLead(admin, { name: "Ana Paula", phone: "(31) 99999-0101", source: "Site" });
    await expect(createLead(admin, { name: "Outra Ana", phone: "+55 31 99999 0101", source: "Site" })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(createLead(admin, { name: "Bruno", phone: "123", source: "Site" })).rejects.toMatchObject({ code: "VALIDATION" });
    expect(await prisma.lead.count()).toBe(1);
  });

  it("valida nome, origem e valor", async () => {
    await expect(createLead(admin, { name: "A", phone: "(31) 99999-0102", source: "Site" })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(createLead(admin, { name: "Ana", phone: "(31) 99999-0102", source: "Panfleto" as never })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(createLead(admin, { name: "Ana", phone: "(31) 99999-0102", source: "Site", estimatedValue: "-5" })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("editar para o telefone de outro lead dá conflito", async () => {
    await createLead(admin, { name: "Ana Paula", phone: "(31) 99999-0101", source: "Site" });
    const other = await createLead(admin, { name: "Bruno Lima", phone: "(31) 99999-0102", source: "Site" });
    await expect(updateLead(admin, other.id, { name: "Bruno Lima", phone: "(31) 99999-0101", source: "Site" })).rejects.toMatchObject({ code: "CONFLICT" });
  });
});

describe("movimentação no funil (RF-04, RF-18, RN-09)", () => {
  it("mover para Perdido exige motivo e cancela o que estava na fila", async () => {
    await makeRule({ name: "Boas-vindas", trigger: "NEW_LEAD", afterMinutes: 5 });
    const created = at("2026-10-19T23:00:00Z"); // fora do horário: job fica PENDING
    const lead = await makeLead({ stageId: world.stages.open.id, createdAt: created });
    await runAutomationCycle(at("2026-10-19T23:10:00Z"));
    expect((await jobsOf(lead.id))[0].status).toBe("PENDING");

    await expect(moveLead(admin, lead.id, world.stages.lost.id)).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(moveLead(admin, lead.id, world.stages.lost.id, "  ")).rejects.toMatchObject({ code: "VALIDATION" });

    await moveLead(admin, lead.id, world.stages.lost.id, "Fechou com concorrente", at("2026-10-19T23:30:00Z"));
    expect((await jobsOf(lead.id))[0]).toMatchObject({ status: "CANCELED", reason: "STAGE_CLOSED" });
    const after = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(after.lostReason).toBe("Fechou com concorrente");
    expect(await prisma.stageHistory.count({ where: { leadId: lead.id } })).toBe(1);
  });

  it("sair de Perdido limpa o motivo; entrar em orçamento marca o instante (RN-15)", async () => {
    const lead = await makeLead({ stageId: world.stages.open.id, createdAt: MON_10H });
    await moveLead(admin, lead.id, world.stages.lost.id, "Sem interesse", MON_10H);
    await moveLead(admin, lead.id, world.stages.quote.id, undefined, addMinutes(MON_10H, 60));
    const after = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(after.lostReason).toBeNull();
    expect(after.stageChangedAt).toEqual(addMinutes(MON_10H, 60));
  });

  it("busca no quadro por nome ou telefone", async () => {
    await makeLead({ stageId: world.stages.open.id, createdAt: MON_10H, name: "Ana Paula", phone: "+5531999990101" });
    await makeLead({ stageId: world.stages.open.id, createdAt: MON_10H, name: "Bruno Lima", phone: "+5531999990102" });
    const byName = (await listBoard(admin, "bruno")).flatMap((s) => s.leads);
    expect(byName.map((l) => l.name)).toEqual(["Bruno Lima"]);
    const byPhone = (await listBoard(admin, "0101")).flatMap((s) => s.leads);
    expect(byPhone.map((l) => l.name)).toEqual(["Ana Paula"]);
  });
});

describe("pausa e contato manual (RF-06, RF-12, RN-10)", () => {
  it("pausar cancela a fila e registra na linha do tempo", async () => {
    await makeRule({ name: "Boas-vindas", trigger: "NEW_LEAD", afterMinutes: 5 });
    const created = at("2026-10-19T23:00:00Z");
    const lead = await makeLead({ stageId: world.stages.open.id, createdAt: created });
    await runAutomationCycle(at("2026-10-19T23:10:00Z"));

    await setPaused(admin, lead.id, true, at("2026-10-19T23:20:00Z"));
    expect((await jobsOf(lead.id))[0]).toMatchObject({ status: "CANCELED", reason: "PAUSED" });
    expect(await prisma.interaction.count({ where: { leadId: lead.id, type: "SYSTEM", body: { contains: "pausou" } } })).toBe(1);
  });

  it("contato manual inicia o ciclo de sem resposta, que alimenta os follow-ups", async () => {
    await makeRule({ name: "Follow-up", trigger: "NO_REPLY", afterMinutes: 24 * 60 });
    const lead = await makeLead({ stageId: world.stages.open.id, createdAt: addMinutes(MON_10H, -600) });

    await registerManualContact(admin, lead.id, "Passei o orçamento pelo WhatsApp pessoal", MON_10H);
    const detail = await getLeadDetail(admin, lead.id, MON_10H);
    expect(detail?.noReply).toBe(true);
    expect(detail?.upcoming).toHaveLength(1);

    const summary = await runAutomationCycle(addMinutes(MON_10H, 24 * 60));
    expect(summary.sent).toBe(1);
  });
});

describe("etapas do funil (RF-03, ADR-006)", () => {
  it("cria, renomeia e reordena etapas", async () => {
    const created = await createStage(admin, { name: "Visita agendada", kind: "OPEN" });
    await updateStage(admin, created.id, { name: "Visita marcada", kind: "OPEN" });
    await moveStage(admin, created.id, "up");
    const stages = await prisma.stage.findMany({ orderBy: { position: "asc" } });
    expect(stages.map((s) => s.name).indexOf("Visita marcada")).toBeLessThan(stages.length - 1);
  });

  it("não deixa o funil sem etapa ganha, perdida ou aberta", async () => {
    await expect(updateStage(admin, world.stages.won.id, { name: "Ganho", kind: "OPEN" })).rejects.toMatchObject({ code: "VALIDATION" });
    expect((await prisma.stage.findUniqueOrThrow({ where: { id: world.stages.won.id } })).kind).toBe("WON");
    await expect(deleteStage(admin, world.stages.lost.id)).rejects.toBeDefined();
    expect(await prisma.stage.count({ where: { kind: "LOST" } })).toBe(1);
  });

  it("não remove etapa que ainda tem leads", async () => {
    await makeLead({ stageId: world.stages.quote.id, createdAt: MON_10H });
    await expect(deleteStage(admin, world.stages.quote.id)).rejects.toMatchObject({ code: "CONFLICT" });
  });
});

describe("modelos e regras (RF-07, RF-08, RN-14, RN-16)", () => {
  it("recusa variável desconhecida no modelo", async () => {
    await expect(saveTemplate(admin, { name: "Modelo", body: "Oi {nome}, seu {pedido}" })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("não apaga modelo em uso por regra nem regra que já executou", async () => {
    const rule = await makeRule({ name: "Boas-vindas", trigger: "NEW_LEAD", afterMinutes: 5 });
    await expect(deleteTemplate(admin, rule.templateId!)).rejects.toMatchObject({ code: "CONFLICT" });

    const lead = await makeLead({ stageId: world.stages.open.id, createdAt: MON_10H });
    await runAutomationCycle(addMinutes(MON_10H, 6));
    expect((await jobsOf(lead.id)).length).toBe(1);
    await expect(deleteRule(admin, rule.id)).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("cada ação exige o seu campo (modelo, título da tarefa ou motivo)", async () => {
    const base = { name: "Regra nova", trigger: "NO_REPLY", afterMinutes: 60 } as const;
    await expect(saveRule(admin, { ...base, action: "SEND_MESSAGE" })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(saveRule(admin, { ...base, action: "CREATE_TASK" })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(saveRule(admin, { ...base, action: "MOVE_TO_LOST" })).rejects.toMatchObject({ code: "VALIDATION" });
  });
});
