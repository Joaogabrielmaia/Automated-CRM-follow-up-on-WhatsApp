import { describe, expect, it } from "vitest";
import { DEFAULT_BUSINESS_HOURS as H, isWithinBusinessHours, nextSendableTime } from "@/lib/rules/business-hours";

// 22/10/2026 é quinta-feira. America/Sao_Paulo = UTC-3, então 10:00 local = 13:00Z.
describe("horário comercial (RN-01, RN-02)", () => {
  it("aceita quinta às 10:00 locais", () => {
    expect(isWithinBusinessHours(new Date("2026-10-22T13:00:00Z"), H)).toBe(true);
  });

  it("trata o fim da janela como fechado: 18:00 em ponto já não envia", () => {
    expect(isWithinBusinessHours(new Date("2026-10-22T20:59:00Z"), H)).toBe(true);
    expect(isWithinBusinessHours(new Date("2026-10-22T21:00:00Z"), H)).toBe(false);
  });

  it("usa o horário local, não o UTC: 23:00 local ainda é quinta", () => {
    expect(isWithinBusinessHours(new Date("2026-10-23T02:00:00Z"), H)).toBe(false);
  });

  it("sábado fecha ao meio-dia e domingo não abre", () => {
    expect(isWithinBusinessHours(new Date("2026-10-24T14:59:00Z"), H)).toBe(true);
    expect(isWithinBusinessHours(new Date("2026-10-24T15:00:00Z"), H)).toBe(false);
    expect(isWithinBusinessHours(new Date("2026-10-25T13:00:00Z"), H)).toBe(false);
  });

  it("antes da abertura espera até as 08:00 do mesmo dia", () => {
    const next = nextSendableTime(new Date("2026-10-22T10:00:00Z"), H);
    expect(next.toISOString()).toBe("2026-10-22T11:00:00.000Z");
  });

  it("à noite espera a abertura do dia seguinte", () => {
    const next = nextSendableTime(new Date("2026-10-23T00:00:00Z"), H);
    expect(next.toISOString()).toBe("2026-10-23T11:00:00.000Z");
  });

  it("sexta depois das 18h vai para sábado de manhã", () => {
    const next = nextSendableTime(new Date("2026-10-23T21:30:00Z"), H);
    expect(next.toISOString()).toBe("2026-10-24T11:00:00.000Z");
  });

  it("sábado depois do meio-dia e domingo vão para segunda", () => {
    expect(nextSendableTime(new Date("2026-10-24T15:00:00Z"), H).toISOString()).toBe("2026-10-26T11:00:00.000Z");
    expect(nextSendableTime(new Date("2026-10-25T13:00:00Z"), H).toISOString()).toBe("2026-10-26T11:00:00.000Z");
  });

  it("dentro da janela devolve a própria data", () => {
    const d = new Date("2026-10-22T14:30:00Z");
    expect(nextSendableTime(d, H)).toBe(d);
  });

  it("respeita uma configuração diferente da padrão", () => {
    const onlyMornings = { ...H, "4": { start: "09:00", end: "11:00" } };
    expect(isWithinBusinessHours(new Date("2026-10-22T15:00:00Z"), onlyMornings)).toBe(false);
    expect(isWithinBusinessHours(new Date("2026-10-22T13:00:00Z"), onlyMornings)).toBe(true);
  });
});
