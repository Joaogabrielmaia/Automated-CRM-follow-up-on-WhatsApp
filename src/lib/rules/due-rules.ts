import type { RuleTrigger, StageKind } from "@prisma/client";

export interface DueLead {
  createdAt: Date;
  stageKind: StageKind;
  stageChangedAt: Date;
  cycleStartedAt: Date | null;
  lastInboundAt: Date | null;
  optedOutAt: Date | null;
  automationPaused: boolean;
  archivedAt: Date | null;
  anonymizedAt: Date | null;
}

export interface DueRule {
  trigger: RuleTrigger;
  afterMinutes: number;
  activatedAt: Date | null;
}

export interface Due {
  dueAt: Date;
  // Instante que identifica o ciclo; entra na chave de idempotência (RN-05).
  stamp: string;
}

export function isAutomatable(lead: DueLead): boolean {
  return (
    (lead.stageKind === "OPEN" || lead.stageKind === "QUOTE") &&
    !lead.automationPaused &&
    !lead.optedOutAt &&
    !lead.archivedAt &&
    !lead.anonymizedAt
  );
}

// "Sem resposta" (RN-08): nenhuma mensagem do lead depois do instante de referência.
function silentSince(lead: DueLead, reference: Date): boolean {
  return !lead.lastInboundAt || lead.lastInboundAt.getTime() < reference.getTime();
}

// Devolve quando a regra vence para o lead, ou null se ela não se aplica.
// Não compara com "agora": quem chama decide se já venceu.
export function computeDue(rule: DueRule, lead: DueLead): Due | null {
  if (!rule.activatedAt || !isAutomatable(lead)) return null;

  let reference: Date | null = null;
  switch (rule.trigger) {
    case "NEW_LEAD":
      reference = lead.createdAt;
      break;
    case "NO_REPLY":
      reference = lead.cycleStartedAt;
      break;
    case "QUOTE_NO_RETURN":
      reference = lead.stageKind === "QUOTE" ? lead.stageChangedAt : null;
      break;
  }
  if (!reference) return null;

  // RN-17: regra recém-ativada não age sobre o que começou antes dela.
  if (reference.getTime() < rule.activatedAt.getTime()) return null;
  if (rule.trigger !== "NEW_LEAD" && !silentSince(lead, reference)) return null;

  return {
    dueAt: new Date(reference.getTime() + rule.afterMinutes * 60_000),
    stamp: String(reference.getTime()),
  };
}

export function idempotencyKey(ruleId: string, leadId: string, stamp: string): string {
  return `${ruleId}:${leadId}:${stamp}`;
}
