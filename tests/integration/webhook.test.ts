import { beforeEach, describe, expect, it } from "vitest";
import { runAutomationCycle } from "@/lib/automation/engine";
import { handleInboundMessage } from "@/lib/automation/inbound";
import { POST } from "@/app/api/webhooks/whatsapp/route";
import { signBody } from "@/lib/rules/signature";
import { addMinutes, at, baseWorld, jobsOf, makeLead, makeRule, MON_10H, prisma, resetDb } from "./helpers";

let world: Awaited<ReturnType<typeof baseWorld>>;

beforeEach(async () => {
  await resetDb();
  world = await baseWorld();
});

const stageId = () => world.stages.open.id;

describe("resposta e opt-out (RN-03, RN-04)", () => {
  it("resposta cancela o que estava na fila e cria uma única tarefa Responder", async () => {
    await makeRule({ name: "Boas-vindas", trigger: "NEW_LEAD", afterMinutes: 5 });
    // Fora do horário, a mensagem fica PENDING na fila.
    const created = at("2026-10-19T23:00:00Z");
    const lead = await makeLead({ stageId: stageId(), createdAt: created, ownerId: world.user.id });
    await runAutomationCycle(at("2026-10-19T23:10:00Z"));

    const reply = at("2026-10-19T23:30:00Z");
    const result = await handleInboundMessage({ eventId: "e1", from: lead.phone, text: "Oi, quero um orçamento" }, reply);
    expect(result).toEqual({ status: "processed", leadId: lead.id });
    await handleInboundMessage({ eventId: "e2", from: lead.phone, text: "Alguém aí?" }, addMinutes(reply, 1));

    const [job] = await jobsOf(lead.id);
    expect(job).toMatchObject({ status: "CANCELED", reason: "REPLIED" });
    const tasks = await prisma.task.findMany({ where: { leadId: lead.id } });
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({ createdBySystem: true, assigneeId: world.user.id });
    expect(tasks[0].dueAt).toEqual(addMinutes(reply, 120));

    const next = await runAutomationCycle(at("2026-10-20T11:00:00Z"));
    expect(next.sent).toBe(0);
  });

  it("SAIR (com acento, caixa e pontuação) bloqueia todos os envios seguintes", async () => {
    await makeRule({ name: "Boas-vindas", trigger: "NEW_LEAD", afterMinutes: 5 });
    const lead = await makeLead({ stageId: stageId(), createdAt: MON_10H });

    const result = await handleInboundMessage({ eventId: "o1", from: lead.phone, text: " Sair! " }, addMinutes(MON_10H, 1));
    expect(result.status).toBe("opt_out");

    const summary = await runAutomationCycle(addMinutes(MON_10H, 10));
    expect(summary).toMatchObject({ created: 0, sent: 0 });
    const updated = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(updated.optedOutAt).not.toBeNull();
    expect(await prisma.task.count({ where: { leadId: lead.id } })).toBe(0);
  });

  it("mesmo evento do webhook chegando duas vezes é descartado", async () => {
    const lead = await makeLead({ stageId: stageId(), createdAt: MON_10H });
    const msg = { eventId: "dup-1", from: lead.phone, text: "Oi" };
    expect((await handleInboundMessage(msg, MON_10H)).status).toBe("processed");
    expect((await handleInboundMessage(msg, MON_10H)).status).toBe("duplicate");
    expect(await prisma.interaction.count({ where: { leadId: lead.id, type: "MESSAGE_IN" } })).toBe(1);
  });

  it("remetente desconhecido não cria lead nem quebra", async () => {
    const result = await handleInboundMessage({ eventId: "u1", from: "+5511988887777", text: "Oi" }, MON_10H);
    expect(result.status).toBe("unknown_sender");
    expect(await prisma.lead.count()).toBe(0);
  });
});

describe("rota do webhook (RNF-09, ADR-007)", () => {
  const secret = () => process.env.WEBHOOK_SECRET!;
  const call = (body: string, signature: string | null) =>
    POST(
      new Request("http://localhost/api/webhooks/whatsapp", {
        method: "POST",
        body,
        headers: signature ? { "x-pulso-signature": signature } : {},
      }),
    );

  it("sem assinatura ou com assinatura errada responde 401 e não grava nada", async () => {
    const lead = await makeLead({ stageId: stageId(), createdAt: MON_10H });
    const body = JSON.stringify({ eventId: "w1", from: lead.phone, text: "Oi" });

    expect((await call(body, null)).status).toBe(401);
    expect((await call(body, signBody("outro-segredo", body))).status).toBe(401);
    expect(await prisma.webhookEvent.count()).toBe(0);
    expect(await prisma.interaction.count({ where: { type: "MESSAGE_IN" } })).toBe(0);
  });

  it("assinatura calculada sobre outro corpo é rejeitada", async () => {
    const lead = await makeLead({ stageId: stageId(), createdAt: MON_10H });
    const signed = JSON.stringify({ eventId: "w2", from: lead.phone, text: "Oi" });
    const tampered = JSON.stringify({ eventId: "w2", from: lead.phone, text: "SAIR" });
    expect((await call(tampered, signBody(secret(), signed))).status).toBe(401);
  });

  it("assinatura válida processa a resposta; reenvio do mesmo evento vira duplicado", async () => {
    const lead = await makeLead({ stageId: stageId(), createdAt: MON_10H });
    const body = JSON.stringify({ eventId: "w3", from: lead.phone, text: "Quero fechar" });

    const first = await call(body, signBody(secret(), body));
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ status: "processed", leadId: lead.id });

    const second = await call(body, signBody(secret(), body));
    expect(await second.json()).toEqual({ status: "duplicate" });
  });

  it("assinatura válida com JSON quebrado ou payload fora do formato responde 400", async () => {
    const broken = "{ não é json";
    expect((await call(broken, signBody(secret(), broken))).status).toBe(400);
    const wrong = JSON.stringify({ eventId: "", from: "1", text: 5 });
    expect((await call(wrong, signBody(secret(), wrong))).status).toBe(400);
  });
});
