import { beforeEach, describe, expect, it } from "vitest";
import type { SessionUser } from "@/lib/auth/permissions";
import { runAutomationCycle } from "@/lib/automation/engine";
import { getDashboard } from "@/lib/services/dashboard";
import { moveLead } from "@/lib/services/leads";
import { SimulatedProvider } from "@/lib/providers/simulated";
import { addMinutes, baseWorld, makeLead, makeRule, MON_10H, nextPhone, prisma, resetDb } from "./helpers";

let world: Awaited<ReturnType<typeof baseWorld>>;
let actor: SessionUser;

beforeEach(async () => {
  await resetDb();
  world = await baseWorld();
  actor = { id: world.user.id, name: world.user.name, email: world.user.email, role: "ADMIN" };
});

// RF-15: cada número do painel precisa bater com as tabelas.
describe("painel", () => {
  it("conta leads, valor por etapa, origem e motivos de perda a partir dos dados", async () => {
    const open = await makeLead({ stageId: world.stages.open.id, createdAt: MON_10H, estimatedValue: "1000.00" });
    const quote = await makeLead({ stageId: world.stages.open.id, createdAt: MON_10H, estimatedValue: "2000.00" });
    const won = await makeLead({ stageId: world.stages.open.id, createdAt: MON_10H, estimatedValue: "3000.00" });
    const lost = await makeLead({ stageId: world.stages.open.id, createdAt: MON_10H });
    for (const lead of [open, quote, won, lost]) {
      await prisma.stageHistory.create({ data: { leadId: lead.id, toStageId: world.stages.open.id, at: MON_10H } });
    }
    await moveLead(actor, quote.id, world.stages.quote.id, undefined, MON_10H);
    await moveLead(actor, won.id, world.stages.quote.id, undefined, MON_10H);
    await moveLead(actor, won.id, world.stages.won.id, undefined, MON_10H);
    await moveLead(actor, lost.id, world.stages.lost.id, "Preço alto", MON_10H);

    const dash = await getDashboard(actor, addMinutes(MON_10H, 60));
    const byName = Object.fromEntries(dash.byStage.map((s) => [s.name, s]));
    expect(byName["Novo"]).toMatchObject({ count: 1, value: 1000 });
    expect(byName["Orçamento"]).toMatchObject({ count: 1, value: 2000 });
    expect(byName["Ganho"]).toMatchObject({ count: 1, value: 3000 });
    expect(dash.openCount).toBe(2);
    expect(dash.lostReasons).toEqual([{ reason: "Preço alto", count: 1 }]);
    expect(dash.bySource[0]).toMatchObject({ source: "Instagram", leads: 4, won: 1, wonValue: 3000 });

    // Novo -> Orçamento: 4 passaram por Novo, 2 por Orçamento. Orçamento -> Ganho: 2 e 1.
    expect(dash.conversion[0]).toMatchObject({ from: "Novo", to: "Orçamento", fromCount: 4, toCount: 2, rate: 0.5 });
    expect(dash.conversion[1]).toMatchObject({ from: "Orçamento", to: "Ganho", fromCount: 2, toCount: 1, rate: 0.5 });
  });

  it("conta mensagens enviadas e falhas, e lead sem resposta, a partir da automação", async () => {
    await makeRule({ name: "Boas-vindas", trigger: "NEW_LEAD", afterMinutes: 5 });
    await makeLead({ stageId: world.stages.open.id, createdAt: MON_10H });
    await makeLead({ stageId: world.stages.open.id, createdAt: MON_10H, phone: nextPhone("9999") });

    const now = addMinutes(MON_10H, 6);
    await runAutomationCycle(now, { provider: new SimulatedProvider() });

    const dash = await getDashboard(actor, now);
    expect(dash).toMatchObject({ sent: 1, failed: 1, noReply: 1 });
    expect(dash.lastRunAt).toEqual(now);
  });

  it("sem dados nenhum devolve zeros e taxas nulas, sem dividir por zero", async () => {
    const dash = await getDashboard(actor, MON_10H);
    expect(dash).toMatchObject({ openCount: 0, noReply: 0, sent: 0, failed: 0, lastRunAt: null });
    expect(dash.conversion.every((c) => c.rate === null)).toBe(true);
  });
});
