import { describe, expect, it } from "vitest";
import { isOptOut, normalizeReply } from "@/lib/rules/opt-out";

describe("opt-out (RN-03)", () => {
  it.each(["SAIR", "sair", "Sair.", "  sair!  ", "PARAR", "parar", "Stop", "STOP!!!"])("reconhece %j", (text) => {
    expect(isOptOut(text)).toBe(true);
  });

  it.each([
    "Não quero sair de casa essa semana",
    "Pode ser amanhã?",
    "sair? não, pode mandar o orçamento",
    "saiir",
    "",
    "parar a obra por uns dias",
  ])("não confunde %j com opt-out", (text) => {
    expect(isOptOut(text)).toBe(false);
  });

  it("normaliza acento, caixa e pontuação", () => {
    expect(normalizeReply("  Não, obrigada! ")).toBe("NAO OBRIGADA");
  });
});
