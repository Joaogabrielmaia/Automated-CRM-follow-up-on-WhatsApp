import { afterEach, describe, expect, it, vi } from "vitest";
import { ProviderError } from "@/lib/providers/types";
import { WhatsAppCloudProvider, buildPayload } from "@/lib/providers/whatsapp-cloud";

const base = { to: "+5531999990101", body: "Oi, Ana!", idempotencyKey: "k", attempt: 1 };

afterEach(() => vi.unstubAllGlobals());

function stubFetch(response: Response | Error) {
  const fetchMock = vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("payload da WhatsApp Cloud API (ADR-002, RSK-08)", () => {
  it("texto livre quando não há modelo aprovado, só com dígitos no destino", () => {
    expect(buildPayload(base)).toEqual({
      messaging_product: "whatsapp",
      to: "5531999990101",
      type: "text",
      text: { body: "Oi, Ana!" },
    });
  });

  it("modelo aprovado com os parâmetros no corpo, na ordem", () => {
    const payload = buildPayload({ ...base, template: { name: "boas_vindas_v1", language: "pt_BR", parameters: ["Ana", "reforma"] } });
    expect(payload).toEqual({
      messaging_product: "whatsapp",
      to: "5531999990101",
      type: "template",
      template: {
        name: "boas_vindas_v1",
        language: { code: "pt_BR" },
        components: [{ type: "body", parameters: [{ type: "text", text: "Ana" }, { type: "text", text: "reforma" }] }],
      },
    });
  });

  it("modelo sem variáveis não manda components", () => {
    const payload = buildPayload({ ...base, template: { name: "ola", language: "pt_BR", parameters: [] } });
    expect(payload.template).toEqual({ name: "ola", language: { code: "pt_BR" } });
  });
});

describe("provedor da WhatsApp Cloud API", () => {
  const provider = new WhatsAppCloudProvider("123456", "token-secreto");

  it("chama a Graph API com o token e devolve o id da mensagem", async () => {
    const fetchMock = stubFetch(new Response(JSON.stringify({ messages: [{ id: "wamid.ABC" }] }), { status: 200 }));
    await expect(provider.send(base)).resolves.toEqual({ providerMessageId: "wamid.ABC" });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://graph.facebook.com/v21.0/123456/messages");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer token-secreto");
    expect(JSON.parse(init.body as string).type).toBe("text");
  });

  it.each([
    [429, true],
    [500, true],
    [503, true],
    [400, false],
    [401, false],
    [404, false],
  ])("status %i: retentável = %s", async (status, retryable) => {
    stubFetch(new Response("{}", { status }));
    const error = await provider.send(base).catch((e) => e);
    expect(error).toBeInstanceOf(ProviderError);
    expect(error.retryable).toBe(retryable);
  });

  it("falha de rede é retentável", async () => {
    stubFetch(new Error("ECONNRESET"));
    const error = await provider.send(base).catch((e) => e);
    expect(error).toBeInstanceOf(ProviderError);
    expect(error.retryable).toBe(true);
  });

  it("resposta 200 sem id de mensagem é tratada como falha retentável", async () => {
    stubFetch(new Response(JSON.stringify({}), { status: 200 }));
    const error = await provider.send(base).catch((e) => e);
    expect(error).toBeInstanceOf(ProviderError);
    expect(error.retryable).toBe(true);
  });
});
