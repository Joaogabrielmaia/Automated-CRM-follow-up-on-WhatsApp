import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/permissions";

export const EVENT_LABELS: Record<string, string> = {
  JOB_CREATED: "Criado",
  MESSAGE_SENT: "Mensagem enviada",
  JOB_SKIPPED: "Pulado",
  JOB_CANCELED: "Cancelado",
  JOB_RESCHEDULED: "Reagendado",
  RETRY_SCHEDULED: "Nova tentativa agendada",
  JOB_FAILED: "Falha",
  JOBS_CANCELED: "Fila cancelada",
  TASK_CREATED: "Tarefa criada",
  LEAD_MOVED_TO_LOST: "Movido para Perdido",
  OPT_OUT: "Pediu para sair",
  LEAD_REPLIED: "Lead respondeu",
  INBOUND_UNKNOWN_SENDER: "Remetente desconhecido",
};

export const REASON_LABELS: Record<string, string> = {
  OFF_HOURS: "Fora do horário comercial",
  MIN_GAP: "Intervalo mínimo entre mensagens",
  LIMIT_REACHED: "Limite de mensagens por ciclo",
  REPLIED: "O lead respondeu",
  OPT_OUT: "O lead pediu para sair",
  PAUSED: "Automação pausada",
  STAGE_CLOSED: "Etapa encerrada",
  LEAD_UNAVAILABLE: "Lead indisponível",
  NO_TEMPLATE: "Regra sem modelo",
  RETRY: "Nova tentativa",
  RETRIES_EXHAUSTED: "Tentativas esgotadas",
  PERMANENT_ERROR: "Erro definitivo do provedor",
  UNCERTAIN_STATE: "Estado incerto",
};

export function describeReason(reason: string | null): string | null {
  if (!reason) return null;
  if (reason.startsWith("MISSING_VARIABLE:")) return `Faltou dado do lead (${reason.split(":")[1]})`;
  return REASON_LABELS[reason] ?? reason;
}

export async function listAutomationLog(actor: SessionUser, filter: { leadId?: string; event?: string } = {}) {
  void actor;
  const [logs, queue, lastRun] = await Promise.all([
    prisma.automationLog.findMany({
      where: { leadId: filter.leadId || undefined, event: filter.event || undefined },
      orderBy: { at: "desc" },
      take: 150,
    }),
    prisma.automationJob.findMany({
      where: { status: "PENDING" },
      orderBy: { scheduledFor: "asc" },
      take: 50,
      include: { lead: { select: { id: true, name: true } }, rule: { select: { name: true } } },
    }),
    prisma.automationRun.findFirst({ orderBy: { startedAt: "desc" } }),
  ]);
  const leadIds = [...new Set(logs.map((l) => l.leadId).filter((id): id is string => !!id))];
  const leads = await prisma.lead.findMany({ where: { id: { in: leadIds } }, select: { id: true, name: true } });
  const names = new Map(leads.map((l) => [l.id, l.name]));
  return {
    logs: logs.map((l) => ({ ...l, leadName: l.leadId ? (names.get(l.leadId) ?? null) : null })),
    queue,
    lastRun,
  };
}
