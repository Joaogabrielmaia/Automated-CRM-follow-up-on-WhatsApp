import type { RuleAction, StageKind } from "@prisma/client";
import { isWithinBusinessHours, nextSendableTime, type BusinessHours } from "./business-hours";

export interface GuardLead {
  stageKind: StageKind;
  optedOutAt: Date | null;
  automationPaused: boolean;
  lastInboundAt: Date | null;
  archivedAt: Date | null;
  anonymizedAt: Date | null;
}

export interface GuardInput {
  lead: GuardLead;
  action: RuleAction;
  // Regra desativada depois de o job ser criado: o job não pode sair (a fila para junto com a regra).
  ruleActive: boolean;
  jobCreatedAt: Date;
  now: Date;
  sentInCycle: number;
  maxPerCycle: number;
  lastAutoSentAt: Date | null;
  minGapMinutes: number;
  hours: BusinessHours;
}

export type GuardDecision =
  | { decision: "proceed" }
  | { decision: "cancel"; reason: string }
  | { decision: "skip"; reason: string }
  | { decision: "reschedule"; to: Date; reason: string };

// A última conferência antes de executar um job. Roda mesmo depois de o job ter sido criado,
// porque o lead pode ter respondido, pedido para sair ou mudado de etapa nesse meio tempo.
export function evaluateGuards(input: GuardInput): GuardDecision {
  const { lead, action, now } = input;

  if (!input.ruleActive) return { decision: "cancel", reason: "RULE_INACTIVE" };
  if (lead.anonymizedAt || lead.archivedAt) return { decision: "cancel", reason: "LEAD_UNAVAILABLE" };
  if (lead.optedOutAt) return { decision: "cancel", reason: "OPT_OUT" };
  if (lead.stageKind === "WON" || lead.stageKind === "LOST") return { decision: "cancel", reason: "STAGE_CLOSED" };
  if (lead.automationPaused) return { decision: "cancel", reason: "PAUSED" };
  if (lead.lastInboundAt && lead.lastInboundAt.getTime() > input.jobCreatedAt.getTime()) {
    return { decision: "cancel", reason: "REPLIED" };
  }

  if (action === "SEND_MESSAGE") {
    if (input.sentInCycle >= input.maxPerCycle) return { decision: "skip", reason: "LIMIT_REACHED" };
    // RN-18: intervalo mínimo entre duas mensagens automáticas ao mesmo lead. Evita rajada quando
    // o ciclo fica parado e volta com várias regras vencidas de uma vez.
    if (input.lastAutoSentAt) {
      const earliest = new Date(input.lastAutoSentAt.getTime() + input.minGapMinutes * 60_000);
      if (now.getTime() < earliest.getTime()) {
        return { decision: "reschedule", to: nextSendableTime(earliest, input.hours), reason: "MIN_GAP" };
      }
    }
    if (!isWithinBusinessHours(now, input.hours)) {
      return { decision: "reschedule", to: nextSendableTime(now, input.hours), reason: "OFF_HOURS" };
    }
  }
  return { decision: "proceed" };
}
