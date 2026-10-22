import type { AutomationJob, AutomationRule, Lead, MessageTemplate, Stage } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  applyStageChange,
  cancelPendingJobs,
  loadSettings,
  writeLog,
  type AutomationSettings,
} from "@/lib/domain/shared";
import { getProvider, ProviderError, type MessageProvider } from "@/lib/providers";
import { backoffMinutes, canRetry } from "@/lib/rules/backoff";
import { nextSendableTime } from "@/lib/rules/business-hours";
import { computeDue, idempotencyKey, type DueLead } from "@/lib/rules/due-rules";
import { evaluateGuards } from "@/lib/rules/guards";
import { renderTemplate } from "@/lib/rules/template";

const BATCH_SIZE = 100; // RNF-06
const STUCK_AFTER_MINUTES = 10; // ADR-003
const LEAD_SCAN_LIMIT = 2000;

export interface CycleSummary {
  runId: string;
  created: number;
  sent: number;
  failed: number;
  skipped: number;
  canceled: number;
  rescheduled: number;
}

interface Ctx {
  now: Date;
  runId: string;
  provider: MessageProvider;
  settings: AutomationSettings;
  summary: CycleSummary;
}

type JobWithRule = AutomationJob & { rule: AutomationRule & { template: MessageTemplate | null } };
type LeadWithStage = Lead & { stage: Stage };

export async function runAutomationCycle(
  now: Date = new Date(),
  options: { provider?: MessageProvider; batchSize?: number } = {},
): Promise<CycleSummary> {
  const run = await prisma.automationRun.create({ data: { startedAt: now } });
  const ctx: Ctx = {
    now,
    runId: run.id,
    provider: options.provider ?? getProvider(),
    settings: await loadSettings(prisma),
    summary: { runId: run.id, created: 0, sent: 0, failed: 0, skipped: 0, canceled: 0, rescheduled: 0 },
  };

  await recoverStuckJobs(ctx);
  ctx.summary.created = await createDueJobs(ctx);
  await processDueJobs(ctx, options.batchSize ?? BATCH_SIZE);

  await prisma.automationRun.update({
    where: { id: run.id },
    data: {
      finishedAt: now,
      created: ctx.summary.created,
      sent: ctx.summary.sent,
      failed: ctx.summary.failed,
      skipped: ctx.summary.skipped,
      rescheduled: ctx.summary.rescheduled,
    },
  });
  return ctx.summary;
}

// ADR-003: job que ficou reservado e nunca terminou. Não sei se a mensagem saiu, então não reenvio.
async function recoverStuckJobs(ctx: Ctx): Promise<void> {
  const limit = new Date(Date.now() - STUCK_AFTER_MINUTES * 60_000);
  const stuck = await prisma.automationJob.findMany({
    where: { status: "SENDING", updatedAt: { lt: limit } },
    include: { lead: { select: { name: true, ownerId: true } } },
  });
  for (const job of stuck) {
    const claimed = await prisma.automationJob.updateMany({
      where: { id: job.id, status: "SENDING" },
      data: { status: "FAILED", reason: "UNCERTAIN_STATE" },
    });
    if (claimed.count === 0) continue;
    ctx.summary.failed++;
    await prisma.task.create({
      data: {
        leadId: job.leadId,
        title: `Conferir se a mensagem para ${job.lead.name} foi enviada (o envio travou)`,
        dueAt: ctx.now,
        assigneeId: job.lead.ownerId,
        createdBySystem: true,
      },
    });
    await writeLog(prisma, {
      at: ctx.now,
      event: "JOB_FAILED",
      detail: "Estado incerto: envio travou depois da reserva. Não reenviei.",
      leadId: job.leadId,
      jobId: job.id,
      runId: ctx.runId,
    });
  }
}

function toDueLead(lead: LeadWithStage): DueLead {
  return { ...lead, stageKind: lead.stage.kind };
}

// Passo 1: descobre o que está devido e grava como job. Rodar de novo não duplica (RN-05).
async function createDueJobs(ctx: Ctx): Promise<number> {
  const rules = await prisma.automationRule.findMany({ where: { active: true, activatedAt: { not: null } } });
  if (rules.length === 0) return 0;

  const leads = await prisma.lead.findMany({
    where: {
      archivedAt: null,
      anonymizedAt: null,
      optedOutAt: null,
      automationPaused: false,
      stage: { kind: { in: ["OPEN", "QUOTE"] } },
    },
    include: { stage: true },
    take: LEAD_SCAN_LIMIT,
  });

  const candidates: { key: string; leadId: string; ruleId: string; scheduledFor: Date }[] = [];
  for (const rule of rules) {
    for (const lead of leads) {
      const due = computeDue(rule, toDueLead(lead));
      if (!due || due.dueAt.getTime() > ctx.now.getTime()) continue;
      candidates.push({
        key: idempotencyKey(rule.id, lead.id, due.stamp),
        leadId: lead.id,
        ruleId: rule.id,
        // Fora do horário a mensagem espera na fila (RN-02). Tarefa e mudança de etapa não esperam.
        scheduledFor: rule.action === "SEND_MESSAGE" ? nextSendableTime(ctx.now, ctx.settings.hours) : ctx.now,
      });
    }
  }
  if (candidates.length === 0) return 0;

  // Só para não tentar inserir toda vez o que já existe. A garantia de verdade é a restrição UNIQUE.
  const existing = await prisma.automationJob.findMany({
    where: { idempotencyKey: { in: candidates.map((c) => c.key) } },
    select: { idempotencyKey: true },
  });
  const known = new Set(existing.map((e) => e.idempotencyKey));

  let created = 0;
  for (const c of candidates) {
    if (known.has(c.key)) continue;
    const result = await prisma.automationJob.createMany({
      data: [
        {
          idempotencyKey: c.key,
          leadId: c.leadId,
          ruleId: c.ruleId,
          scheduledFor: c.scheduledFor,
          createdAt: ctx.now,
        },
      ],
      skipDuplicates: true,
    });
    if (result.count === 1) {
      created++;
      await writeLog(prisma, {
        at: ctx.now,
        event: "JOB_CREATED",
        detail: c.scheduledFor.getTime() > ctx.now.getTime() ? "Agendado para a próxima janela comercial" : "Pronto para executar",
        leadId: c.leadId,
        runId: ctx.runId,
      });
    }
  }
  return created;
}

async function processDueJobs(ctx: Ctx, batchSize: number): Promise<void> {
  const jobs = await prisma.automationJob.findMany({
    where: { status: "PENDING", scheduledFor: { lte: ctx.now } },
    orderBy: { scheduledFor: "asc" },
    take: batchSize,
    include: { rule: { include: { template: true } } },
  });
  for (const job of jobs) {
    await processJob(ctx, job);
  }
}

async function finish(
  ctx: Ctx,
  job: JobWithRule,
  status: "CANCELED" | "SKIPPED" | "DONE" | "FAILED",
  reason: string | null,
  event: string,
  detail?: string,
): Promise<void> {
  await prisma.automationJob.update({ where: { id: job.id }, data: { status, reason } });
  await writeLog(prisma, {
    at: ctx.now,
    event,
    detail: detail ?? reason,
    leadId: job.leadId,
    jobId: job.id,
    runId: ctx.runId,
  });
}

async function processJob(ctx: Ctx, job: JobWithRule): Promise<void> {
  // Reserva atômica (ADR-003): só uma execução consegue mudar PENDING para SENDING.
  const claim = await prisma.automationJob.updateMany({
    where: { id: job.id, status: "PENDING" },
    data: { status: "SENDING", attempts: { increment: 1 } },
  });
  if (claim.count === 0) return;
  const attempt = job.attempts + 1;

  const lead = await prisma.lead.findUnique({ where: { id: job.leadId }, include: { stage: true } });
  if (!lead) {
    await finish(ctx, job, "CANCELED", "LEAD_UNAVAILABLE", "JOB_CANCELED");
    ctx.summary.canceled++;
    return;
  }

  const cycleStart = lead.lastInboundAt ?? lead.createdAt;
  const [sentInCycle, lastAuto] = await Promise.all([
    prisma.automationJob.count({
      where: { leadId: lead.id, status: "SENT", rule: { action: "SEND_MESSAGE" }, sentAt: { gte: cycleStart } },
    }),
    prisma.automationJob.findFirst({
      where: { leadId: lead.id, status: "SENT", rule: { action: "SEND_MESSAGE" } },
      orderBy: { sentAt: "desc" },
      select: { sentAt: true },
    }),
  ]);

  const decision = evaluateGuards({
    lead: { ...lead, stageKind: lead.stage.kind },
    action: job.rule.action,
    jobCreatedAt: job.createdAt,
    now: ctx.now,
    sentInCycle,
    maxPerCycle: ctx.settings.maxPerCycle,
    lastAutoSentAt: lastAuto?.sentAt ?? null,
    minGapMinutes: ctx.settings.minGapMinutes,
    hours: ctx.settings.hours,
  });

  if (decision.decision === "cancel") {
    await finish(ctx, job, "CANCELED", decision.reason, "JOB_CANCELED");
    ctx.summary.canceled++;
    return;
  }
  if (decision.decision === "skip") {
    await finish(ctx, job, "SKIPPED", decision.reason, "JOB_SKIPPED");
    ctx.summary.skipped++;
    return;
  }
  if (decision.decision === "reschedule") {
    // Não foi uma tentativa de envio de verdade, então devolvo a contagem.
    await prisma.automationJob.update({
      where: { id: job.id },
      data: { status: "PENDING", scheduledFor: decision.to, attempts: { decrement: 1 }, reason: decision.reason },
    });
    await writeLog(prisma, {
      at: ctx.now,
      event: "JOB_RESCHEDULED",
      detail: `${decision.reason}: volta a tentar em ${decision.to.toISOString()}`,
      leadId: lead.id,
      jobId: job.id,
      runId: ctx.runId,
    });
    ctx.summary.rescheduled++;
    return;
  }

  switch (job.rule.action) {
    case "SEND_MESSAGE":
      await executeSend(ctx, job, lead, attempt);
      break;
    case "CREATE_TASK":
      await executeCreateTask(ctx, job, lead);
      break;
    case "MOVE_TO_LOST":
      await executeMoveToLost(ctx, job, lead);
      break;
  }
}

async function executeSend(ctx: Ctx, job: JobWithRule, lead: LeadWithStage, attempt: number): Promise<void> {
  const template = job.rule.template;
  if (!template) {
    await finish(ctx, job, "SKIPPED", "NO_TEMPLATE", "JOB_SKIPPED", "A regra não tem modelo de mensagem");
    ctx.summary.skipped++;
    return;
  }

  const rendered = renderTemplate(template.body, {
    nome: lead.name,
    servico: lead.interest,
    valor: lead.estimatedValue?.toNumber() ?? null,
  });
  if (!rendered.ok) {
    const reason = `MISSING_VARIABLE:${rendered.missing.join(",")}`;
    await finish(ctx, job, "SKIPPED", reason, "JOB_SKIPPED", `Faltou dado do lead para o modelo: ${rendered.missing.join(", ")}`);
    ctx.summary.skipped++;
    return;
  }

  try {
    const result = await ctx.provider.send({
      to: lead.phone,
      body: rendered.text,
      idempotencyKey: job.idempotencyKey,
      attempt,
    });
    await prisma.$transaction([
      prisma.automationJob.update({
        where: { id: job.id },
        data: { status: "SENT", sentAt: ctx.now, providerMessageId: result.providerMessageId, reason: null, lastError: null },
      }),
      prisma.interaction.create({
        data: { leadId: lead.id, type: "MESSAGE_OUT", body: rendered.text, createdAt: ctx.now },
      }),
      prisma.lead.update({
        where: { id: lead.id },
        data: { lastOutboundAt: ctx.now, cycleStartedAt: lead.cycleStartedAt ?? ctx.now },
      }),
    ]);
    await writeLog(prisma, {
      at: ctx.now,
      event: "MESSAGE_SENT",
      detail: `${job.rule.name} (tentativa ${attempt})`,
      leadId: lead.id,
      jobId: job.id,
      runId: ctx.runId,
    });
    ctx.summary.sent++;
  } catch (error) {
    await handleSendFailure(ctx, job, lead, attempt, error);
  }
}

async function handleSendFailure(
  ctx: Ctx,
  job: JobWithRule,
  lead: LeadWithStage,
  attempt: number,
  error: unknown,
): Promise<void> {
  const message = error instanceof Error ? error.message : "Erro desconhecido";
  // Erro que não veio do provedor é tratado como passageiro: melhor tentar de novo do que perder.
  const retryable = error instanceof ProviderError ? error.retryable : true;

  if (canRetry(attempt, retryable)) {
    const wait = backoffMinutes(attempt);
    const next = nextSendableTime(new Date(ctx.now.getTime() + wait * 60_000), ctx.settings.hours);
    await prisma.automationJob.update({
      where: { id: job.id },
      data: { status: "PENDING", scheduledFor: next, lastError: message, reason: "RETRY" },
    });
    await writeLog(prisma, {
      at: ctx.now,
      event: "RETRY_SCHEDULED",
      detail: `Tentativa ${attempt} falhou (${message}). Nova tentativa em ${wait} min.`,
      leadId: lead.id,
      jobId: job.id,
      runId: ctx.runId,
    });
    ctx.summary.rescheduled++;
    return;
  }

  await prisma.automationJob.update({
    where: { id: job.id },
    data: { status: "FAILED", lastError: message, reason: retryable ? "RETRIES_EXHAUSTED" : "PERMANENT_ERROR" },
  });
  await prisma.task.create({
    data: {
      leadId: lead.id,
      title: `Verificar contato de ${lead.name}: a mensagem automática não foi enviada`,
      dueAt: ctx.now,
      assigneeId: lead.ownerId,
      createdBySystem: true,
    },
  });
  await writeLog(prisma, {
    at: ctx.now,
    event: "JOB_FAILED",
    detail: `${message} (${attempt} tentativa(s))`,
    leadId: lead.id,
    jobId: job.id,
    runId: ctx.runId,
  });
  ctx.summary.failed++;
}

async function executeCreateTask(ctx: Ctx, job: JobWithRule, lead: LeadWithStage): Promise<void> {
  const raw = job.rule.taskTitle ?? job.rule.name;
  const title = raw.replace(/\{nome\}/g, lead.name.split(" ")[0]);
  await prisma.task.create({
    data: { leadId: lead.id, title, dueAt: ctx.now, assigneeId: lead.ownerId, createdBySystem: true },
  });
  await finish(ctx, job, "DONE", null, "TASK_CREATED", title);
}

async function executeMoveToLost(ctx: Ctx, job: JobWithRule, lead: LeadWithStage): Promise<void> {
  const lost = await prisma.stage.findFirst({ where: { kind: "LOST" }, orderBy: { position: "asc" } });
  if (!lost) {
    await finish(ctx, job, "SKIPPED", "NO_LOST_STAGE", "JOB_SKIPPED", "Não existe etapa de perdido");
    ctx.summary.skipped++;
    return;
  }
  const reason = job.rule.lostReason ?? "Sem resposta";
  await prisma.$transaction(async (tx) => {
    await applyStageChange(tx, lead, lead.stage, lost, { now: ctx.now, lostReason: reason, runId: ctx.runId });
    await cancelPendingJobs(tx, lead.id, "STAGE_CLOSED", ctx.now, ctx.runId);
    await tx.automationJob.update({ where: { id: job.id }, data: { status: "DONE", reason: null } });
  });
  await writeLog(prisma, {
    at: ctx.now,
    event: "LEAD_MOVED_TO_LOST",
    detail: reason,
    leadId: lead.id,
    jobId: job.id,
    runId: ctx.runId,
  });
}
