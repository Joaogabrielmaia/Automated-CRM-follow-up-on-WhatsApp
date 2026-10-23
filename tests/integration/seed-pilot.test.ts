import { beforeEach, describe, expect, it } from "vitest";
import { PILOT_RULES, PILOT_TEMPLATES, seedPilotData } from "../../prisma/pilot-data";
import { runAutomationCycle } from "@/lib/automation/engine";
import { businessHoursSchema } from "@/lib/rules/business-hours";
import { extractVariables, renderTemplate } from "@/lib/rules/template";
import { saveTemplate } from "@/lib/services/templates";
import { createLead } from "@/lib/services/leads";
import { MON_10H, addMinutes, prisma, resetDb } from "./helpers";

beforeEach(resetDb);

describe("seed de piloto", () => {
  it("cria um funil válido, a configuração, os modelos e as regras", async () => {
    expect(await seedPilotData(prisma)).toEqual({ created: true });

    const kinds = (await prisma.stage.findMany({ orderBy: { position: "asc" } })).map((s) => s.kind);
    for (const kind of ["OPEN", "QUOTE", "WON", "LOST"] as const) expect(kinds).toContain(kind);
    expect(kinds[0]).toBe("OPEN"); // lead novo entra numa etapa aberta

    const settings = await prisma.setting.findUniqueOrThrow({ where: { id: 1 } });
    expect(businessHoursSchema.safeParse(settings.businessHours).success).toBe(true);
    expect(settings).toMatchObject({ maxMessagesPerCycle: 3, minGapMinutes: 720 });

    expect(await prisma.messageTemplate.count()).toBe(PILOT_TEMPLATES.length);
    expect(await prisma.automationRule.count()).toBe(PILOT_RULES.length);
  });

  it("todas as regras nascem desligadas e sem instante de ativação", async () => {
    await seedPilotData(prisma);
    const rules = await prisma.automationRule.findMany();
    expect(rules.every((r) => !r.active && r.activatedAt === null)).toBe(true);
  });

  it("não cria contas nem leads de demonstração", async () => {
    await seedPilotData(prisma);
    expect(await prisma.user.count()).toBe(0);
    expect(await prisma.lead.count()).toBe(0);
  });

  it("os modelos só usam variáveis conhecidas e passam na mesma validação da tela", async () => {
    const admin = { id: "x", name: "Admin", email: "a@teste.dev", role: "ADMIN" as const };
    for (const t of PILOT_TEMPLATES) {
      expect(extractVariables(t.body).every((v) => ["nome", "servico", "valor"].includes(v))).toBe(true);
      await expect(saveTemplate(admin, { name: t.name, body: t.body })).resolves.toBeDefined();
      expect(renderTemplate(t.body, { nome: "Ana Paula", servico: "reforma", valor: 1000 }).ok).toBe(true);
    }
  });

  it("a primeira mensagem avisa como parar (boas práticas)", () => {
    expect(PILOT_TEMPLATES.find((t) => t.key === "welcome")!.body).toMatch(/responda SAIR/);
  });

  it("é idempotente: rodar de novo não duplica nada", async () => {
    await seedPilotData(prisma);
    expect(await seedPilotData(prisma)).toEqual({ created: false });
    expect(await prisma.stage.count()).toBe(6);
    expect(await prisma.automationRule.count()).toBe(PILOT_RULES.length);
  });

  it("com tudo desligado, um lead novo não gera nenhum trabalho", async () => {
    await seedPilotData(prisma);
    const user = await prisma.user.create({ data: { name: "Camila", email: "c@teste.dev", passwordHash: "x", role: "ATTENDANT" } });
    await createLead({ id: user.id, name: user.name, email: user.email, role: "ATTENDANT" }, { name: "Ana Paula", phone: "(31) 99999-0101", source: "Site" }, MON_10H);
    const summary = await runAutomationCycle(addMinutes(MON_10H, 30));
    expect(summary).toMatchObject({ created: 0, sent: 0 });
  });
});
