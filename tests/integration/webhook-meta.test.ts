import { beforeEach, describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/webhooks/whatsapp-cloud/route";
import { signBody } from "@/lib/rules/signature";
import { baseWorld, makeLead, MON_10H, prisma, resetDb } from "./helpers";

// Entrada nativa da Meta (ADR-007 revisto). O formato do payload segue a documentação pública da Cloud API.
const APP_SECRET = "segredo-do-app-meta-de-teste";
const VERIFY_TOKEN = "token-de-verificacao-de-teste";

let stageId: string;

beforeEach(async () => {
  process.env.WHATSAPP_APP_SECRET = APP_SECRET;
  process.env.WHATSAPP_VERIFY_TOKEN = VERIFY_TOKEN;
  await resetDb();
  stageId = (await baseWorld()).stages.open.id;
});

const payload = (messages: unknown[]) =>
  JSON.stringify({
    object: "whatsapp_business_account",
    entry: [{ id: "1", changes: [{ field: "messages", value: { messaging_product: "whatsapp", messages } }] }],
  });

const textMessage = (id: string, from: string, body: string) => ({
  id,
  from,
  timestamp: "1792420800",
  type: "text",
  text: { body },
});

const post = (body: string, signature: string | null = signBody(APP_SECRET, body)) =>
  POST(
    new Request("http://localhost/api/webhooks/whatsapp-cloud", {
      method: "POST",
      body,
      headers: signature ? { "x-hub-signature-256": signature } : {},
    }),
  );

describe("verificação do webhook (GET)", () => {
  const verify = (query: string) => GET(new Request(`http://localhost/api/webhooks/whatsapp-cloud?${query}`));

  it("devolve o desafio da Meta quando o token confere", async () => {
    const response = await verify(`hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=1158201444`);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("1158201444");
  });

  it("recusa token errado, modo errado e token ausente", async () => {
    expect((await verify("hub.mode=subscribe&hub.verify_token=errado&hub.challenge=1")).status).toBe(403);
    expect((await verify(`hub.mode=unsubscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=1`)).status).toBe(403);
    expect((await verify("hub.mode=subscribe&hub.challenge=1")).status).toBe(403);
  });

  it("sem WHATSAPP_VERIFY_TOKEN configurado recusa tudo", async () => {
    delete process.env.WHATSAPP_VERIFY_TOKEN;
    expect((await verify("hub.mode=subscribe&hub.verify_token=&hub.challenge=1")).status).toBe(403);
  });
});

describe("assinatura dos eventos (POST)", () => {
  it("sem assinatura, com assinatura errada ou sobre outro corpo: 401 e nada é gravado", async () => {
    const lead = await makeLead({ stageId, createdAt: MON_10H, phone: "+5531999990101" });
    const body = payload([textMessage("wamid.1", "5531999990101", "Oi")]);

    expect((await post(body, null)).status).toBe(401);
    expect((await post(body, signBody("outro-segredo", body))).status).toBe(401);
    expect((await post(body, signBody(APP_SECRET, body + " "))).status).toBe(401);
    expect(await prisma.webhookEvent.count()).toBe(0);
    expect(await prisma.interaction.count({ where: { leadId: lead.id, type: "MESSAGE_IN" } })).toBe(0);
  });

  it("sem WHATSAPP_APP_SECRET configurado responde 500, nunca aceita sem conferir", async () => {
    delete process.env.WHATSAPP_APP_SECRET;
    expect((await post(payload([]), "sha256=qualquer")).status).toBe(500);
  });
});

describe("mensagens recebidas", () => {
  it("texto de um lead interrompe a sequência e cria a tarefa Responder (RN-04)", async () => {
    const lead = await makeLead({ stageId, createdAt: MON_10H, phone: "+5531999990101" });
    const response = await post(payload([textMessage("wamid.2", "5531999990101", "Quero fechar")]));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: 1 });
    expect(await prisma.interaction.count({ where: { leadId: lead.id, type: "MESSAGE_IN", body: "Quero fechar" } })).toBe(1);
    const updated = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(updated.lastInboundAt).toEqual(new Date(1792420800 * 1000));
    expect(await prisma.task.count({ where: { leadId: lead.id, title: { startsWith: "Responder" } } })).toBe(1);
  });

  it("SAIR pela Meta bloqueia o lead (RN-03)", async () => {
    const lead = await makeLead({ stageId, createdAt: MON_10H, phone: "+5531999990101" });
    await post(payload([textMessage("wamid.3", "5531999990101", "Sair")]));
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } })).optedOutAt).not.toBeNull();
  });

  it("o mesmo evento reenviado pela Meta não duplica nada", async () => {
    const lead = await makeLead({ stageId, createdAt: MON_10H, phone: "+5531999990101" });
    const body = payload([textMessage("wamid.4", "5531999990101", "Oi")]);
    expect((await post(body)).status).toBe(200);
    expect((await post(body)).status).toBe(200);
    expect(await prisma.interaction.count({ where: { leadId: lead.id, type: "MESSAGE_IN" } })).toBe(1);
  });

  it("celular antigo entregue sem o 9 casa com o lead cadastrado com o 9", async () => {
    const lead = await makeLead({ stageId, createdAt: MON_10H, phone: "+5531999990101" });
    await post(payload([textMessage("wamid.5", "553199990101", "Oi")]));
    expect(await prisma.interaction.count({ where: { leadId: lead.id, type: "MESSAGE_IN" } })).toBe(1);
  });

  it("áudio ou imagem também contam como resposta, mas nunca como SAIR", async () => {
    const lead = await makeLead({ stageId, createdAt: MON_10H, phone: "+5531999990101" });
    await post(payload([{ id: "wamid.6", from: "5531999990101", timestamp: "1792420800", type: "audio", audio: { id: "x" } }]));
    const message = await prisma.interaction.findFirstOrThrow({ where: { leadId: lead.id, type: "MESSAGE_IN" } });
    expect(message.body).toBe("[audio]");
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } })).optedOutAt).toBeNull();
  });

  it("resposta de botão usa o título do botão como texto", async () => {
    const lead = await makeLead({ stageId, createdAt: MON_10H, phone: "+5531999990101" });
    await post(
      payload([
        {
          id: "wamid.7",
          from: "5531999990101",
          timestamp: "1792420800",
          type: "interactive",
          interactive: { button_reply: { id: "1", title: "Parar" } },
        },
      ]),
    );
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } })).optedOutAt).not.toBeNull();
  });

  it("várias mensagens no mesmo evento são todas processadas", async () => {
    const a = await makeLead({ stageId, createdAt: MON_10H, phone: "+5531999990101" });
    const b = await makeLead({ stageId, createdAt: MON_10H, phone: "+5531999990102" });
    const response = await post(
      payload([textMessage("wamid.8", "5531999990101", "Oi"), textMessage("wamid.9", "5531999990102", "Olá")]),
    );
    expect(await response.json()).toEqual({ received: 2 });
    expect(await prisma.interaction.count({ where: { leadId: { in: [a.id, b.id] }, type: "MESSAGE_IN" } })).toBe(2);
  });

  it("evento de status (entregue, lida) e remetente desconhecido respondem 200 sem alterar nada", async () => {
    const status = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [{ id: "1", changes: [{ field: "messages", value: { statuses: [{ id: "wamid.x", status: "read" }] } }] }],
    });
    expect(await (await post(status)).json()).toEqual({ received: 0 });

    const unknown = await post(payload([textMessage("wamid.10", "5511988887777", "Oi")]));
    expect(unknown.status).toBe(200);
    expect(await prisma.lead.count()).toBe(0);
  });

  it("JSON quebrado ou fora do formato: 400", async () => {
    const broken = "{ não é json";
    expect((await post(broken)).status).toBe(400);
    const wrong = JSON.stringify({ entry: "não é lista" });
    expect((await post(wrong)).status).toBe(400);
  });
});
