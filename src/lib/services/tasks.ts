import { z } from "zod";
import { prisma } from "@/lib/db";
import { authorize, type SessionUser } from "@/lib/auth/permissions";
import { invalid } from "@/lib/errors";
import { isNoReply } from "./leads";

const taskSchema = z.object({
  leadId: z.string().optional(),
  title: z.string().trim().min(2, "Descreva a tarefa").max(200),
  dueAt: z.date({ message: "Informe o prazo" }),
  assigneeId: z.string().optional(),
});

export async function createTask(actor: SessionUser, raw: z.input<typeof taskSchema>) {
  authorize(actor, "tasks:write");
  const parsed = taskSchema.safeParse(raw);
  if (!parsed.success) throw invalid(parsed.error.issues[0]?.message ?? "Dados inválidos");
  return prisma.task.create({ data: { ...parsed.data, assigneeId: parsed.data.assigneeId ?? actor.id } });
}

export async function setTaskDone(actor: SessionUser, taskId: string, done: boolean, now: Date = new Date()) {
  authorize(actor, "tasks:write");
  await prisma.task.update({ where: { id: taskId }, data: { doneAt: done ? now : null } });
}

// Tela "Hoje" (RNF-05): o que a atendente precisa fazer, na ordem em que dói mais.
export async function getTodayView(actor: SessionUser, now: Date = new Date()) {
  void actor;
  const endOfToday = new Date(now.getTime() - 3 * 3600_000);
  endOfToday.setUTCHours(23, 59, 59, 999);
  const endUtc = new Date(endOfToday.getTime() + 3 * 3600_000);

  const tasks = await prisma.task.findMany({
    where: { doneAt: null },
    include: { lead: { select: { id: true, name: true } }, assignee: { select: { name: true } } },
    orderBy: { dueAt: "asc" },
    take: 100,
  });

  const candidates = await prisma.lead.findMany({
    where: { archivedAt: null, cycleStartedAt: { not: null }, stage: { kind: { in: ["OPEN", "QUOTE"] } } },
    include: { stage: true },
    orderBy: { cycleStartedAt: "asc" },
    take: 200,
  });
  const noReply = candidates.filter((lead) => isNoReply(lead, lead.stage.kind));

  return {
    overdue: tasks.filter((t) => t.dueAt.getTime() < now.getTime()),
    today: tasks.filter((t) => t.dueAt.getTime() >= now.getTime() && t.dueAt.getTime() <= endUtc.getTime()),
    upcoming: tasks.filter((t) => t.dueAt.getTime() > endUtc.getTime()),
    noReply,
  };
}
