import { z } from "zod";
import { prisma } from "@/lib/db";
import { authorize, type SessionUser } from "@/lib/auth/permissions";
import { writeLog } from "@/lib/domain/shared";
import { conflict, invalid } from "@/lib/errors";

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

const ruleSchema = z
  .object({
    name: z.string().trim().min(3, "Dê um nome à regra").max(100),
    trigger: z.enum(["NEW_LEAD", "NO_REPLY", "QUOTE_NO_RETURN"], { message: "Escolha o gatilho" }),
    afterMinutes: z.coerce.number().int("Use um número inteiro").min(1, "O atraso mínimo é 1 minuto").max(60 * 24 * 30),
    action: z.enum(["SEND_MESSAGE", "CREATE_TASK", "MOVE_TO_LOST"], { message: "Escolha a ação" }),
    templateId: z.preprocess(emptyToUndefined, z.string().optional()),
    taskTitle: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
    lostReason: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  })
  .superRefine((rule, ctx) => {
    if (rule.action === "SEND_MESSAGE" && !rule.templateId) {
      ctx.addIssue({ code: "custom", message: "Escolha o modelo de mensagem", path: ["templateId"] });
    }
    if (rule.action === "CREATE_TASK" && !rule.taskTitle) {
      ctx.addIssue({ code: "custom", message: "Escreva o título da tarefa", path: ["taskTitle"] });
    }
    if (rule.action === "MOVE_TO_LOST" && !rule.lostReason) {
      ctx.addIssue({ code: "custom", message: "Informe o motivo da perda", path: ["lostReason"] });
    }
  });

export type RuleInput = z.input<typeof ruleSchema>;

export async function saveRule(actor: SessionUser, raw: RuleInput & { id?: string }) {
  authorize(actor, "rules:write");
  const parsed = ruleSchema.safeParse(raw);
  if (!parsed.success) throw invalid(parsed.error.issues[0]?.message ?? "Dados inválidos");
  const data = {
    ...parsed.data,
    templateId: parsed.data.action === "SEND_MESSAGE" ? parsed.data.templateId : null,
    taskTitle: parsed.data.action === "CREATE_TASK" ? parsed.data.taskTitle : null,
    lostReason: parsed.data.action === "MOVE_TO_LOST" ? parsed.data.lostReason : null,
  };
  if (raw.id) return prisma.automationRule.update({ where: { id: raw.id }, data });
  // Nasce inativa: o dono revisa e liga quando quiser (HU-07).
  return prisma.automationRule.create({ data: { ...data, active: false } });
}

// RN-17: ao ativar, guardo o instante. A regra só vale para o que começar depois dele.
// Ao desativar, o que a regra já tinha na fila também é cancelado: desligar tem que parar de verdade.
export async function setRuleActive(actor: SessionUser, id: string, active: boolean, now: Date = new Date()) {
  authorize(actor, "rules:write");
  if (active) {
    return prisma.automationRule.update({ where: { id }, data: { active: true, activatedAt: now } });
  }
  return prisma.$transaction(async (tx) => {
    const rule = await tx.automationRule.update({ where: { id }, data: { active: false } });
    const canceled = await tx.automationJob.updateMany({
      where: { ruleId: id, status: "PENDING" },
      data: { status: "CANCELED", reason: "RULE_INACTIVE" },
    });
    if (canceled.count > 0) {
      await writeLog(tx, {
        at: now,
        event: "JOBS_CANCELED",
        detail: `${canceled.count} pendente(s) cancelado(s): regra "${rule.name}" desativada`,
      });
    }
    return rule;
  });
}

export async function deleteRule(actor: SessionUser, id: string) {
  authorize(actor, "rules:write");
  const jobs = await prisma.automationJob.count({ where: { ruleId: id } });
  if (jobs > 0) throw conflict("Esta regra já gerou execuções. Desative-a em vez de apagar, para manter o histórico.");
  await prisma.automationRule.delete({ where: { id } });
}

export function listRules() {
  return prisma.automationRule.findMany({
    orderBy: [{ trigger: "asc" }, { afterMinutes: "asc" }],
    include: { template: { select: { id: true, name: true, body: true } } },
  });
}
