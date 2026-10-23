import { beforeEach, describe, expect, it } from "vitest";
import type { SessionUser } from "@/lib/auth/permissions";
import { runAutomationCycle } from "@/lib/automation/engine";
import { importLeads } from "@/lib/services/import";
import { addMinutes, baseWorld, makeLead, makeRule, MON_10H, prisma, resetDb } from "./helpers";

let world: Awaited<ReturnType<typeof baseWorld>>;
let actor: SessionUser;

beforeEach(async () => {
  await resetDb();
  world = await baseWorld();
  actor = { id: world.user.id, name: world.user.name, email: world.user.email, role: "ATTENDANT" };
});

const CSV = [
  "nome;telefone;origem;interesse;valor",
  "Ana Paula Souza;(31) 99999-0101;Instagram;Reforma de banheiro;12.400,00",
  "Bruno Lima;31 98888-0202;indicacao;Troca de piso;",
].join("\n");

describe("importação da planilha (migração de leads)", () => {
  it("cria os leads pelo mesmo caminho do cadastro: telefone padronizado, etapa inicial, histórico", async () => {
    const result = await importLeads(actor, CSV, {}, MON_10H);
    expect(result).toEqual({ created: 2, skipped: [] });

    const ana = await prisma.lead.findUniqueOrThrow({ where: { phone: "+5531999990101" }, include: { stage: true } });
    expect(ana).toMatchObject({ name: "Ana Paula Souza", source: "Instagram", interest: "Reforma de banheiro", ownerId: actor.id });
    expect(ana.estimatedValue?.toNumber()).toBe(12400);
    expect(ana.stage.kind).toBe("OPEN");
    expect(await prisma.stageHistory.count({ where: { leadId: ana.id } })).toBe(1);

    const bruno = await prisma.lead.findUniqueOrThrow({ where: { phone: "+5531988880202" } });
    expect(bruno.source).toBe("Indicação");
    expect(bruno.estimatedValue).toBeNull();
  });

  it("começa com a automação pausada, então a regra de lead novo não dispara em lead antigo", async () => {
    await makeRule({ name: "Boas-vindas", trigger: "NEW_LEAD", afterMinutes: 5 });
    await importLeads(actor, CSV, {}, MON_10H);
    const leads = await prisma.lead.findMany();
    expect(leads.every((l) => l.automationPaused)).toBe(true);
    expect(await prisma.interaction.count({ where: { body: { contains: "Importado da planilha" } } })).toBe(2);

    const summary = await runAutomationCycle(addMinutes(MON_10H, 10));
    expect(summary).toMatchObject({ created: 0, sent: 0 });
  });

  it("sem a pausa (opção desmarcada), os leads entram na automação normalmente", async () => {
    await importLeads(actor, CSV, { pauseAutomation: false }, MON_10H);
    expect((await prisma.lead.findMany()).every((l) => !l.automationPaused)).toBe(true);
  });

  it("pula telefone repetido e inválido, relata a linha e importa o resto", async () => {
    await makeLead({ stageId: world.stages.open.id, createdAt: MON_10H, phone: "+5531999990101" });
    const csv = [CSV, "Carla Mendes;123;Site;;", "Davi Rocha;31 97777-0303;Site;;"].join("\n");

    const result = await importLeads(actor, csv, {}, MON_10H);
    expect(result.created).toBe(2); // Bruno e Davi
    expect(result.skipped.map((s) => s.line)).toEqual([2, 4]);
    expect(result.skipped[0].message).toMatch(/já existe/i);
    expect(result.skipped[1].message).toMatch(/Telefone inválido/);
  });

  it("repetido dentro do próprio arquivo também é pulado", async () => {
    const csv = "nome;telefone\nAna;31999990101\nAna de novo;(31) 99999-0101";
    const result = await importLeads(actor, csv, {}, MON_10H);
    expect(result.created).toBe(1);
    expect(result.skipped).toEqual([{ line: 3, message: "Já existe um lead com esse telefone." }]);
  });

  it("arquivo sem as colunas obrigatórias é recusado inteiro, sem criar nada", async () => {
    await expect(importLeads(actor, "cliente;email\nAna;a@b.com", {}, MON_10H)).rejects.toMatchObject({ code: "VALIDATION" });
    expect(await prisma.lead.count()).toBe(0);
  });

  it("arquivo acima de 1 MB é recusado", async () => {
    const huge = "nome;telefone\n" + "x".repeat(1_000_001);
    await expect(importLeads(actor, huge, {}, MON_10H)).rejects.toMatchObject({ code: "VALIDATION" });
  });
});
