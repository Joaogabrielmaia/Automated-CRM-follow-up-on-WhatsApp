import { z } from "zod";
import { prisma } from "@/lib/db";
import { authorize, type SessionUser } from "@/lib/auth/permissions";
import { conflict, invalid, notFound } from "@/lib/errors";

const stageSchema = z.object({
  name: z.string().trim().min(2, "Dê um nome à etapa").max(40),
  kind: z.enum(["OPEN", "QUOTE", "WON", "LOST"], { message: "Escolha o tipo da etapa" }),
});

export function listStages() {
  return prisma.stage.findMany({ orderBy: { position: "asc" }, include: { _count: { select: { leads: true } } } });
}

// ADR-006: sempre precisa existir pelo menos uma etapa de "ganho" e uma de "perdido".
async function assertInvariants() {
  const [won, lost, open] = await Promise.all([
    prisma.stage.count({ where: { kind: "WON" } }),
    prisma.stage.count({ where: { kind: "LOST" } }),
    prisma.stage.count({ where: { kind: "OPEN" } }),
  ]);
  if (won < 1 || lost < 1 || open < 1) {
    throw invalid("O funil precisa ter ao menos uma etapa aberta, uma ganha e uma perdida.");
  }
}

export async function createStage(actor: SessionUser, raw: z.input<typeof stageSchema>) {
  authorize(actor, "settings:write");
  const parsed = stageSchema.safeParse(raw);
  if (!parsed.success) throw invalid(parsed.error.issues[0]?.message ?? "Dados inválidos");
  const last = await prisma.stage.findFirst({ orderBy: { position: "desc" } });
  return prisma.stage.create({ data: { ...parsed.data, position: (last?.position ?? 0) + 1 } });
}

export async function updateStage(actor: SessionUser, id: string, raw: z.input<typeof stageSchema>) {
  authorize(actor, "settings:write");
  const parsed = stageSchema.safeParse(raw);
  if (!parsed.success) throw invalid(parsed.error.issues[0]?.message ?? "Dados inválidos");
  const before = await prisma.stage.findUnique({ where: { id } });
  if (!before) throw notFound();
  const updated = await prisma.stage.update({ where: { id }, data: parsed.data });
  try {
    await assertInvariants();
  } catch (error) {
    await prisma.stage.update({ where: { id }, data: { kind: before.kind } });
    throw error;
  }
  return updated;
}

export async function moveStage(actor: SessionUser, id: string, direction: "up" | "down") {
  authorize(actor, "settings:write");
  const stages = await prisma.stage.findMany({ orderBy: { position: "asc" } });
  const index = stages.findIndex((s) => s.id === id);
  const swapWith = stages[direction === "up" ? index - 1 : index + 1];
  if (index < 0 || !swapWith) return;
  const current = stages[index];
  await prisma.$transaction([
    prisma.stage.update({ where: { id: current.id }, data: { position: swapWith.position } }),
    prisma.stage.update({ where: { id: swapWith.id }, data: { position: current.position } }),
  ]);
}

export async function deleteStage(actor: SessionUser, id: string) {
  authorize(actor, "settings:write");
  const leads = await prisma.lead.count({ where: { stageId: id } });
  if (leads > 0) throw conflict("Esta etapa ainda tem leads. Mova-os antes de remover.");
  const history = await prisma.stageHistory.count({ where: { toStageId: id } });
  if (history > 0) throw conflict("Esta etapa tem histórico no painel e não pode ser removida. Renomeie-a em vez disso.");
  const stage = await prisma.stage.delete({ where: { id } });
  try {
    await assertInvariants();
  } catch (error) {
    await prisma.stage.create({ data: stage });
    throw error;
  }
}
