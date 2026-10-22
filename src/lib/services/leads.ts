import { z } from "zod";
import { prisma } from "@/lib/db";
import { applyStageChange, cancelPendingJobs, isUniqueViolation, loadSettings, writeLog } from "@/lib/domain/shared";
import { authorize, type SessionUser } from "@/lib/auth/permissions";
import { conflict, invalid, notFound } from "@/lib/errors";
import { computeDue } from "@/lib/rules/due-rules";
import { normalizePhone } from "@/lib/rules/phone";
import { nextSendableTime } from "@/lib/rules/business-hours";

export const SOURCES = ["Instagram", "Indicação", "Anúncio", "Site", "Outro"] as const;

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

export const leadInputSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do lead").max(100),
  phone: z.string().trim().min(1, "Informe o telefone"),
  source: z.enum(SOURCES, { message: "Escolha a origem" }),
  interest: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  estimatedValue: z.preprocess(emptyToUndefined, z.coerce.number().min(0, "Valor inválido").max(10_000_000).optional()),
  ownerId: z.preprocess(emptyToUndefined, z.string().optional()),
});

export type LeadInput = z.input<typeof leadInputSchema>;

function parse<T extends z.ZodTypeAny>(schema: T, data: unknown): z.output<T> {
  const result = schema.safeParse(data);
  if (!result.success) throw invalid(result.error.issues[0]?.message ?? "Dados inválidos");
  return result.data;
}

export async function createLead(actor: SessionUser, raw: LeadInput, now: Date = new Date()) {
  authorize(actor, "leads:write");
  const input = parse(leadInputSchema, raw);
  const phone = normalizePhone(input.phone);
  if (!phone) throw invalid("Telefone inválido. Use DDD + número, por exemplo (31) 90000-0101.");

  const stage = await prisma.stage.findFirst({ where: { kind: "OPEN" }, orderBy: { position: "asc" } });
  if (!stage) throw invalid("Não existe etapa inicial configurada.");

  try {
    return await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.create({
        data: {
          name: input.name,
          phone,
          source: input.source,
          interest: input.interest ?? null,
          estimatedValue: input.estimatedValue ?? null,
          ownerId: input.ownerId ?? actor.id,
          stageId: stage.id,
          createdAt: now,
          stageChangedAt: now,
        },
      });
      await tx.stageHistory.create({ data: { leadId: lead.id, fromStageId: null, toStageId: stage.id, at: now } });
      await tx.interaction.create({
        data: { leadId: lead.id, type: "SYSTEM", body: `Lead cadastrado por ${actor.name}`, createdAt: now },
      });
      return lead;
    });
  } catch (error) {
    if (isUniqueViolation(error, "phone")) throw conflict("Já existe um lead com esse telefone.");
    throw error;
  }
}

export async function updateLead(actor: SessionUser, id: string, raw: LeadInput) {
  authorize(actor, "leads:write");
  const input = parse(leadInputSchema, raw);
  const phone = normalizePhone(input.phone);
  if (!phone) throw invalid("Telefone inválido. Use DDD + número, por exemplo (31) 90000-0101.");
  try {
    return await prisma.lead.update({
      where: { id },
      data: {
        name: input.name,
        phone,
        source: input.source,
        interest: input.interest ?? null,
        estimatedValue: input.estimatedValue ?? null,
        ownerId: input.ownerId ?? null,
      },
    });
  } catch (error) {
    if (isUniqueViolation(error, "phone")) throw conflict("Já existe um lead com esse telefone.");
    throw error;
  }
}

export async function moveLead(
  actor: SessionUser,
  leadId: string,
  stageId: string,
  lostReason?: string,
  now: Date = new Date(),
) {
  authorize(actor, "leads:write");
  const [lead, target] = await Promise.all([
    prisma.lead.findUnique({ where: { id: leadId }, include: { stage: true } }),
    prisma.stage.findUnique({ where: { id: stageId } }),
  ]);
  if (!lead || !target) throw notFound();
  if (lead.anonymizedAt) throw invalid("Este lead foi anonimizado.");
  if (lead.stageId === target.id) return lead;

  const reason = lostReason?.trim();
  if (target.kind === "LOST" && (!reason || reason.length < 3)) {
    throw invalid("Informe o motivo da perda."); // RF-18
  }

  await prisma.$transaction((tx) =>
    applyStageChange(tx, lead, lead.stage, target, { now, lostReason: reason }),
  );
  return prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
}

export async function addNote(actor: SessionUser, leadId: string, body: string, now: Date = new Date()) {
  authorize(actor, "leads:write");
  const text = body.trim();
  if (text.length < 1 || text.length > 1000) throw invalid("A nota precisa ter entre 1 e 1000 caracteres.");
  await prisma.interaction.create({ data: { leadId, type: "NOTE", body: `${actor.name}: ${text}`, createdAt: now } });
}

// A atendente conversou fora do sistema (WhatsApp pessoal) e quer que o Pulso saiba.
// Isso inicia o ciclo de "sem resposta" (RN-08), que é a base dos follow-ups.
export async function registerManualContact(actor: SessionUser, leadId: string, body: string, now: Date = new Date()) {
  authorize(actor, "leads:write");
  const text = body.trim();
  if (!text) throw invalid("Descreva o que foi enviado.");
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw notFound();
  await prisma.$transaction([
    prisma.interaction.create({ data: { leadId, type: "MESSAGE_OUT", body: `${actor.name}: ${text}`, createdAt: now } }),
    prisma.lead.update({
      where: { id: leadId },
      data: { lastOutboundAt: now, cycleStartedAt: lead.cycleStartedAt ?? now },
    }),
  ]);
}

export async function setPaused(actor: SessionUser, leadId: string, paused: boolean, now: Date = new Date()) {
  authorize(actor, "leads:pause");
  await prisma.$transaction(async (tx) => {
    await tx.lead.update({ where: { id: leadId }, data: { automationPaused: paused } });
    await tx.interaction.create({
      data: {
        leadId,
        type: "SYSTEM",
        body: paused ? `${actor.name} pausou a automação` : `${actor.name} retomou a automação`,
        createdAt: now,
      },
    });
    if (paused) await cancelPendingJobs(tx, leadId, "PAUSED", now);
  });
}

export async function removeOptOut(actor: SessionUser, leadId: string, now: Date = new Date()) {
  authorize(actor, "leads:remove-opt-out");
  await prisma.$transaction([
    prisma.lead.update({ where: { id: leadId }, data: { optedOutAt: null } }),
    prisma.interaction.create({
      data: { leadId, type: "SYSTEM", body: `${actor.name} removeu o bloqueio de envios (opt-out)`, createdAt: now },
    }),
  ]);
}

export async function archiveLead(actor: SessionUser, leadId: string, now: Date = new Date()) {
  authorize(actor, "leads:write");
  await prisma.$transaction(async (tx) => {
    await tx.lead.update({ where: { id: leadId }, data: { archivedAt: now } });
    await cancelPendingJobs(tx, leadId, "LEAD_UNAVAILABLE", now);
  });
}

// RNF-04: apaga o que identifica a pessoa e mantém só o necessário para as contagens do painel.
export async function anonymizeLead(actor: SessionUser, leadId: string, now: Date = new Date()) {
  authorize(actor, "leads:anonymize");
  await prisma.$transaction(async (tx) => {
    await cancelPendingJobs(tx, leadId, "LEAD_UNAVAILABLE", now);
    await tx.interaction.deleteMany({ where: { leadId } });
    await tx.task.deleteMany({ where: { leadId } });
    await tx.lead.update({
      where: { id: leadId },
      data: {
        name: "Lead anonimizado",
        phone: `anon-${leadId}`,
        interest: null,
        lostReason: null,
        anonymizedAt: now,
        archivedAt: now,
      },
    });
    await tx.interaction.create({
      data: { leadId, type: "SYSTEM", body: "Dados pessoais removidos (anonimização)", createdAt: now },
    });
  });
}

export async function listBoard(actor: SessionUser, search?: string, now: Date = new Date()) {
  void actor;
  const term = search?.trim();
  const stages = await prisma.stage.findMany({
    orderBy: { position: "asc" },
    include: {
      leads: {
        where: {
          archivedAt: null,
          ...(term
            ? { OR: [{ name: { contains: term, mode: "insensitive" } }, { phone: { contains: term.replace(/\D/g, "") || "—" } }] }
            : {}),
        },
        include: { owner: { select: { name: true } } },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  return stages.map((stage) => ({
    ...stage,
    leads: stage.leads.map((lead) => ({
      ...lead,
      estimatedValue: lead.estimatedValue?.toNumber() ?? null,
      noReply: isNoReply(lead, stage.kind),
      now,
    })),
  }));
}

export function isNoReply(
  lead: { cycleStartedAt: Date | null; lastInboundAt: Date | null; optedOutAt: Date | null },
  kind: string,
): boolean {
  if (kind === "WON" || kind === "LOST" || lead.optedOutAt || !lead.cycleStartedAt) return false;
  return !lead.lastInboundAt || lead.lastInboundAt.getTime() < lead.cycleStartedAt.getTime();
}

export async function getLeadDetail(actor: SessionUser, id: string, now: Date = new Date()) {
  void actor;
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      stage: true,
      owner: { select: { id: true, name: true } },
      interactions: { orderBy: { createdAt: "desc" }, take: 100 },
      tasks: { where: { doneAt: null }, orderBy: { dueAt: "asc" } },
      jobs: { where: { status: "PENDING" }, include: { rule: true }, orderBy: { scheduledFor: "asc" } },
    },
  });
  if (!lead) return null;

  // "Próximo passo da automação": o que as regras ativas vão fazer com este lead e quando.
  const [rules, settings] = await Promise.all([
    prisma.automationRule.findMany({ where: { active: true } }),
    loadSettings(prisma),
  ]);
  const queuedRuleIds = new Set(lead.jobs.map((j) => j.ruleId));
  const upcoming = rules
    .filter((rule) => !queuedRuleIds.has(rule.id))
    .map((rule) => {
      const due = computeDue(rule, { ...lead, stageKind: lead.stage.kind });
      if (!due) return null;
      const alreadyCreated = due.dueAt.getTime() <= now.getTime();
      return alreadyCreated ? null : { ruleName: rule.name, at: rule.action === "SEND_MESSAGE" ? nextSendableTime(due.dueAt, settings.hours) : due.dueAt };
    })
    .filter((x): x is { ruleName: string; at: Date } => x !== null)
    .sort((a, b) => a.at.getTime() - b.at.getTime());

  return {
    ...lead,
    estimatedValue: lead.estimatedValue?.toNumber() ?? null,
    noReply: isNoReply(lead, lead.stage.kind),
    upcoming,
  };
}

export async function logManual(leadId: string, event: string, detail: string, now: Date = new Date()) {
  await writeLog(prisma, { at: now, event, detail, leadId });
}
