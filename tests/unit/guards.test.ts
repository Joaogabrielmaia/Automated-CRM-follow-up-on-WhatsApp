import { describe, expect, it } from "vitest";
import { DEFAULT_BUSINESS_HOURS } from "@/lib/rules/business-hours";
import { evaluateGuards, type GuardInput } from "@/lib/rules/guards";

// Quinta 10:00 local = 13:00Z.
const now = new Date("2026-10-22T13:00:00Z");
const created = new Date("2026-10-22T12:00:00Z");

const input = (patch: Partial<GuardInput> = {}, lead: Partial<GuardInput["lead"]> = {}): GuardInput => ({
  lead: {
    stageKind: "OPEN",
    optedOutAt: null,
    automationPaused: false,
    lastInboundAt: null,
    archivedAt: null,
    anonymizedAt: null,
    ...lead,
  },
  action: "SEND_MESSAGE",
  jobCreatedAt: created,
  now,
  sentInCycle: 0,
  maxPerCycle: 3,
  lastAutoSentAt: null,
  minGapMinutes: 720,
  hours: DEFAULT_BUSINESS_HOURS,
  ...patch,
});

describe("travas antes de enviar (RN-03, RN-04, RN-06, RN-09, RN-10)", () => {
  it("libera um envio normal", () => {
    expect(evaluateGuards(input())).toEqual({ decision: "proceed" });
  });

  it("cancela por opt-out", () => {
    expect(evaluateGuards(input({}, { optedOutAt: created }))).toEqual({ decision: "cancel", reason: "OPT_OUT" });
  });

  it("cancela se o lead respondeu depois da criação do job", () => {
    const r = evaluateGuards(input({}, { lastInboundAt: new Date("2026-10-22T12:30:00Z") }));
    expect(r).toEqual({ decision: "cancel", reason: "REPLIED" });
  });

  it("ignora resposta anterior à criação do job", () => {
    expect(evaluateGuards(input({}, { lastInboundAt: new Date("2026-10-22T11:00:00Z") })).decision).toBe("proceed");
  });

  it("cancela em etapa encerrada e em pausa", () => {
    expect(evaluateGuards(input({}, { stageKind: "WON" }))).toEqual({ decision: "cancel", reason: "STAGE_CLOSED" });
    expect(evaluateGuards(input({}, { stageKind: "LOST" }))).toEqual({ decision: "cancel", reason: "STAGE_CLOSED" });
    expect(evaluateGuards(input({}, { automationPaused: true }))).toEqual({ decision: "cancel", reason: "PAUSED" });
  });

  it("pula quando atingiu o limite por ciclo", () => {
    expect(evaluateGuards(input({ sentInCycle: 3 }))).toEqual({ decision: "skip", reason: "LIMIT_REACHED" });
    expect(evaluateGuards(input({ sentInCycle: 2 })).decision).toBe("proceed");
  });

  it("reagenda para a próxima abertura quando está fora do horário", () => {
    const night = new Date("2026-10-23T01:00:00Z");
    const r = evaluateGuards(input({ now: night }));
    expect(r).toEqual({ decision: "reschedule", to: new Date("2026-10-23T11:00:00Z"), reason: "OFF_HOURS" });
  });

  it("segura uma segunda mensagem automática antes do intervalo mínimo (RN-18)", () => {
    const sixHoursAgo = new Date("2026-10-22T07:00:00Z");
    const r = evaluateGuards(input({ lastAutoSentAt: sixHoursAgo }));
    // 07:00Z + 12h = 19:00Z = 16:00 local, ainda dentro do horário.
    expect(r).toEqual({ decision: "reschedule", to: new Date("2026-10-22T19:00:00Z"), reason: "MIN_GAP" });
  });

  it("depois do intervalo mínimo libera normalmente", () => {
    expect(evaluateGuards(input({ lastAutoSentAt: new Date("2026-10-21T12:00:00Z") })).decision).toBe("proceed");
  });

  it("tarefa e mudança de etapa não dependem de horário nem de limite", () => {
    const night = new Date("2026-10-23T01:00:00Z");
    expect(evaluateGuards(input({ now: night, action: "CREATE_TASK", sentInCycle: 9 })).decision).toBe("proceed");
    expect(evaluateGuards(input({ now: night, action: "MOVE_TO_LOST" })).decision).toBe("proceed");
  });

  it("a trava de opt-out vale também para tarefa", () => {
    expect(evaluateGuards(input({ action: "CREATE_TASK" }, { optedOutAt: created })).decision).toBe("cancel");
  });
});
