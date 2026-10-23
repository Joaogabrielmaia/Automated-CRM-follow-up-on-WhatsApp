import { describe, expect, it } from "vitest";
import { formatPhone, normalizePhone, withNinthDigit } from "@/lib/rules/phone";

describe("telefone (RN-13)", () => {
  it.each([
    ["(31) 90000-0101", "+5531900000101"],
    ["31 90000 0101", "+5531900000101"],
    ["+55 31 90000-0101", "+5531900000101"],
    ["5531900000101", "+5531900000101"],
    ["(31) 3000-0101", "+553130000101"],
  ])("normaliza %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(["", "123", "(00) 90000-0101", "(31) 80000-0101", "abcdef", "31 9000-010"])("recusa %j", (input) => {
    expect(normalizePhone(input)).toBeNull();
  });

  it("formata para exibir", () => {
    expect(formatPhone("+5531900000101")).toBe("(31) 90000-0101");
    expect(formatPhone("+553130000101")).toBe("(31) 3000-0101");
  });
});

describe("celular sem o nono dígito (entrega da Meta)", () => {
  it("devolve a forma com o 9 para celular antigo", () => {
    expect(withNinthDigit("+553199990101")).toBe("+5531999990101");
  });

  it("não mexe em telefone fixo nem em número que já tem o 9", () => {
    expect(withNinthDigit("+553132220101")).toBeNull();
    expect(withNinthDigit("+5531999990101")).toBeNull();
    expect(withNinthDigit("lixo")).toBeNull();
  });
});
