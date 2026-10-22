import { describe, expect, it } from "vitest";
import { computeDue, idempotencyKey, type DueLead, type DueRule } from "@/lib/rules/due-rules";

const t = (iso: string) => new Date(iso);

const baseLead: DueLead = {
  createdAt: t("2026-10-20T12:00:00Z"),
  stageKind: "OPEN",
  stageChangedAt: t("2026-10-20T12:00:00Z"),
  cycleStartedAt: null,
  lastInboundAt: null,
  optedOutAt: null,
  automationPaused: false,
  archivedAt: null,
  anonymizedAt: null,
};

const activeSince = t("2026-10-01T00:00:00Z");
const welcome: DueRule = { trigger: "NEW_LEAD", afterMinutes: 5, activatedAt: activeSince };
const followUp1: DueRule = { trigger: "NO_REPLY", afterMinutes: 24 * 60, activatedAt: activeSince };
const quote: DueRule = { trigger: "QUOTE_NO_RETURN", afterMinutes: 48 * 60, activatedAt: activeSince };

describe("quando uma regra vence (RN-07, RN-08, RN-12, RN-15, RN-17)", () => {
  it("boas-vindas vence 5 minutos depois da criação", () => {
    expect(computeDue(welcome, baseLead)?.dueAt.toISOString()).toBe("2026-10-20T12:05:00.000Z");
  });

  it("follow-up só existe depois que o ciclo começa", () => {
    expect(computeDue(followUp1, baseLead)).toBeNull();
    const due = computeDue(followUp1, { ...baseLead, cycleStartedAt: t("2026-10-20T12:05:00Z") });
    expect(due?.dueAt.toISOString()).toBe("2026-10-21T12:05:00.000Z");
  });

  it("follow-up não vence se o lead respondeu depois do início do ciclo", () => {
    const lead = { ...baseLead, cycleStartedAt: t("2026-10-20T12:05:00Z"), lastInboundAt: t("2026-10-20T15:00:00Z") };
    expect(computeDue(followUp1, lead)).toBeNull();
  });

  it("uma resposta antiga não impede um ciclo novo", () => {
    const lead = { ...baseLead, lastInboundAt: t("2026-10-18T10:00:00Z"), cycleStartedAt: t("2026-10-20T12:05:00Z") };
    expect(computeDue(followUp1, lead)).not.toBeNull();
  });

  it("orçamento sem retorno só vale na etapa de orçamento e conta desde a entrada nela", () => {
    expect(computeDue(quote, baseLead)).toBeNull();
    const lead = { ...baseLead, stageKind: "QUOTE" as const, stageChangedAt: t("2026-10-21T09:00:00Z") };
    expect(computeDue(quote, lead)?.dueAt.toISOString()).toBe("2026-10-23T09:00:00.000Z");
  });

  it("regra inativa não age", () => {
    expect(computeDue({ ...welcome, activatedAt: null }, baseLead)).toBeNull();
  });

  it("regra ativada hoje não age sobre lead criado antes dela (RN-17)", () => {
    expect(computeDue({ ...welcome, activatedAt: t("2026-10-21T00:00:00Z") }, baseLead)).toBeNull();
  });

  it.each([
    ["pausado", { automationPaused: true }],
    ["em opt-out", { optedOutAt: t("2026-10-20T13:00:00Z") }],
    ["arquivado", { archivedAt: t("2026-10-20T13:00:00Z") }],
    ["anonimizado", { anonymizedAt: t("2026-10-20T13:00:00Z") }],
    ["ganho", { stageKind: "WON" as const }],
    ["perdido", { stageKind: "LOST" as const }],
  ])("lead %s não recebe nada", (_, patch) => {
    expect(computeDue(welcome, { ...baseLead, ...patch })).toBeNull();
  });

  it("a chave muda quando o ciclo muda e se repete quando é o mesmo", () => {
    const a = computeDue(followUp1, { ...baseLead, cycleStartedAt: t("2026-10-20T12:05:00Z") })!;
    const b = computeDue(followUp1, { ...baseLead, cycleStartedAt: t("2026-10-20T12:05:00Z") })!;
    const c = computeDue(followUp1, { ...baseLead, cycleStartedAt: t("2026-10-25T12:05:00Z") })!;
    expect(idempotencyKey("r1", "l1", a.stamp)).toBe(idempotencyKey("r1", "l1", b.stamp));
    expect(idempotencyKey("r1", "l1", a.stamp)).not.toBe(idempotencyKey("r1", "l1", c.stamp));
  });
});
