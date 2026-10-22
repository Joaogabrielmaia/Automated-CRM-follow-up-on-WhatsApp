import { describe, expect, it } from "vitest";
import { signBody, verifySignature } from "@/lib/rules/signature";

const secret = "segredo-de-teste";
const body = JSON.stringify({ eventId: "evt-1", from: "+5531900000101", text: "oi" });

describe("assinatura do webhook (RNF-09)", () => {
  it("aceita a assinatura correta", () => {
    expect(verifySignature(secret, body, signBody(secret, body))).toBe(true);
  });

  it("recusa corpo alterado", () => {
    expect(verifySignature(secret, body.replace("oi", "tchau"), signBody(secret, body))).toBe(false);
  });

  it("recusa segredo diferente", () => {
    expect(verifySignature(secret, body, signBody("outro-segredo", body))).toBe(false);
  });

  it("recusa cabeçalho ausente, vazio ou com tamanho diferente", () => {
    expect(verifySignature(secret, body, null)).toBe(false);
    expect(verifySignature(secret, body, "")).toBe(false);
    expect(verifySignature(secret, body, "sha256=abc")).toBe(false);
  });
});
