import { Prisma, type PrismaClient } from "@prisma/client";
import { DEFAULT_BUSINESS_HOURS, businessHoursSchema, type BusinessHours } from "@/lib/rules/business-hours";

export type Db = PrismaClient | Prisma.TransactionClient;

export interface LogEntry {
  at: Date;
  event: string;
  detail?: string | null;
  leadId?: string | null;
  jobId?: string | null;
  runId?: string | null;
}

// RNF-07: cada decisão da automação deixa um registro. Não guardo o texto das mensagens aqui.
export async function writeLog(db: Db, entry: LogEntry): Promise<void> {
  await db.automationLog.create({
    data: {
      at: entry.at,
      event: entry.event,
      detail: entry.detail ?? null,
      leadId: entry.leadId ?? null,
      jobId: entry.jobId ?? null,
      runId: entry.runId ?? null,
    },
  });
}

export interface AutomationSettings {
  hours: BusinessHours;
  maxPerCycle: number;
  minGapMinutes: number;
}

export async function loadSettings(db: Db): Promise<AutomationSettings> {
  const row = await db.setting.findUnique({ where: { id: 1 } });
  if (!row) return { hours: DEFAULT_BUSINESS_HOURS, maxPerCycle: 3, minGapMinutes: 720 };
  const parsed = businessHoursSchema.safeParse(row.businessHours);
  return {
    hours: parsed.success ? parsed.data : DEFAULT_BUSINESS_HOURS,
    maxPerCycle: row.maxMessagesPerCycle,
    minGapMinutes: row.minGapMinutes,
  };
}

// Cancela o que está na fila do lead. Chamado por resposta, opt-out e etapa encerrada.
export async function cancelPendingJobs(
  db: Db,
  leadId: string,
  reason: string,
  now: Date,
  runId?: string,
): Promise<number> {
  const result = await db.automationJob.updateMany({
    where: { leadId, status: "PENDING" },
    data: { status: "CANCELED", reason },
  });
  if (result.count > 0) {
    await writeLog(db, {
      at: now,
      event: "JOBS_CANCELED",
      detail: `${result.count} pendente(s) cancelado(s): ${reason}`,
      leadId,
      runId,
    });
  }
  return result.count;
}

export interface StageRef {
  id: string;
  name: string;
  kind: "OPEN" | "QUOTE" | "WON" | "LOST";
}

// Troca a etapa do lead e registra tudo o que depende disso. Usado pela tela e pela automação.
export async function applyStageChange(
  db: Db,
  lead: { id: string; stageId: string },
  from: StageRef | null,
  to: StageRef,
  options: { now: Date; lostReason?: string | null; runId?: string },
): Promise<void> {
  const { now } = options;
  await db.lead.update({
    where: { id: lead.id },
    data: {
      stageId: to.id,
      stageChangedAt: now,
      lostReason: to.kind === "LOST" ? (options.lostReason ?? null) : null,
    },
  });
  await db.stageHistory.create({ data: { leadId: lead.id, fromStageId: lead.stageId, toStageId: to.id, at: now } });
  const suffix = to.kind === "LOST" && options.lostReason ? ` (motivo: ${options.lostReason})` : "";
  await db.interaction.create({
    data: {
      leadId: lead.id,
      type: "STAGE_CHANGE",
      body: `Etapa: ${from?.name ?? "—"} → ${to.name}${suffix}`,
      createdAt: now,
    },
  });
  if (to.kind === "WON" || to.kind === "LOST") {
    await cancelPendingJobs(db, lead.id, "STAGE_CLOSED", now, options.runId);
  }
}

export function isUniqueViolation(error: unknown, field?: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return false;
  if (!field) return true;
  const target = error.meta?.target;
  return Array.isArray(target) ? target.includes(field) : String(target ?? "").includes(field);
}
