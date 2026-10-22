import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/permissions";
import { isNoReply } from "./leads";

const DAY = 24 * 3600_000;

// RF-15. Todos os números saem das tabelas; nada é estimado.
export async function getDashboard(actor: SessionUser, now: Date = new Date()) {
  void actor;
  const since = new Date(now.getTime() - 30 * DAY);

  const [stages, leads, history, sent, failed, lastRun] = await Promise.all([
    prisma.stage.findMany({ orderBy: { position: "asc" } }),
    prisma.lead.findMany({
      where: { archivedAt: null },
      select: {
        id: true,
        source: true,
        stageId: true,
        estimatedValue: true,
        cycleStartedAt: true,
        lastInboundAt: true,
        optedOutAt: true,
        lostReason: true,
      },
    }),
    prisma.stageHistory.findMany({ select: { leadId: true, toStageId: true } }),
    prisma.automationJob.count({
      where: { status: "SENT", rule: { action: "SEND_MESSAGE" }, sentAt: { gte: since } },
    }),
    prisma.automationJob.count({
      where: { status: "FAILED", rule: { action: "SEND_MESSAGE" }, updatedAt: { gte: since } },
    }),
    prisma.automationRun.findFirst({ orderBy: { startedAt: "desc" } }),
  ]);

  const stageById = new Map(stages.map((s) => [s.id, s]));

  const byStage = stages.map((stage) => {
    const inStage = leads.filter((l) => l.stageId === stage.id);
    return {
      id: stage.id,
      name: stage.name,
      kind: stage.kind,
      count: inStage.length,
      value: inStage.reduce((sum, l) => sum + (l.estimatedValue?.toNumber() ?? 0), 0),
    };
  });

  // Passagem entre etapas: de quantos leads que chegaram a uma etapa, quantos chegaram à seguinte
  // (só etapas que não são "perdido", na ordem do funil).
  const reached = new Map<string, Set<string>>();
  for (const h of history) {
    if (!reached.has(h.toStageId)) reached.set(h.toStageId, new Set());
    reached.get(h.toStageId)!.add(h.leadId);
  }
  const pipeline = stages.filter((s) => s.kind !== "LOST");
  const conversion = pipeline.slice(1).map((stage, i) => {
    const previous = pipeline[i];
    const from = reached.get(previous.id)?.size ?? 0;
    const to = reached.get(stage.id)?.size ?? 0;
    return { from: previous.name, to: stage.name, fromCount: from, toCount: to, rate: from > 0 ? to / from : null };
  });

  const open = leads.filter((l) => {
    const kind = stageById.get(l.stageId)?.kind;
    return kind === "OPEN" || kind === "QUOTE";
  });
  const noReply = open.filter((l) => isNoReply(l, stageById.get(l.stageId)!.kind)).length;

  const sources = new Map<string, { leads: number; won: number; wonValue: number }>();
  for (const l of leads) {
    const row = sources.get(l.source) ?? { leads: 0, won: 0, wonValue: 0 };
    row.leads++;
    if (stageById.get(l.stageId)?.kind === "WON") {
      row.won++;
      row.wonValue += l.estimatedValue?.toNumber() ?? 0;
    }
    sources.set(l.source, row);
  }
  const bySource = [...sources.entries()]
    .map(([source, row]) => ({ source, ...row, rate: row.leads > 0 ? row.won / row.leads : 0 }))
    .sort((a, b) => b.leads - a.leads);

  const lostReasons = new Map<string, number>();
  for (const l of leads) {
    if (stageById.get(l.stageId)?.kind === "LOST" && l.lostReason) {
      lostReasons.set(l.lostReason, (lostReasons.get(l.lostReason) ?? 0) + 1);
    }
  }

  return {
    openCount: open.length,
    noReply,
    sent,
    failed,
    byStage,
    conversion,
    bySource,
    lostReasons: [...lostReasons.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count),
    lastRunAt: lastRun?.startedAt ?? null,
  };
}
