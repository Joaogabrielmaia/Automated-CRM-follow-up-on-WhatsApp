import { z } from "zod";
import { prisma } from "@/lib/db";
import { cancelPendingJobs, isUniqueViolation, writeLog } from "@/lib/domain/shared";
import { isOptOut } from "@/lib/rules/opt-out";
import { normalizePhone } from "@/lib/rules/phone";

export const inboundSchema = z.object({
  eventId: z.string().min(1).max(120),
  from: z.string().min(8).max(30),
  text: z.string().max(2000),
  timestamp: z.string().datetime().optional(),
});

export type InboundMessage = z.infer<typeof inboundSchema>;

export type InboundResult =
  | { status: "processed"; leadId: string }
  | { status: "opt_out"; leadId: string }
  | { status: "duplicate" }
  | { status: "unknown_sender" };

const REPLY_TASK_PREFIX = "Responder";
const REPLY_TASK_HOURS = 2;

// Tudo o que acontece quando o lead escreve (RN-03, RN-04). Chamado pelo webhook e pelo simulador,
// então os dois caminhos são, por construção, o mesmo.
export async function handleInboundMessage(message: InboundMessage, now: Date = new Date()): Promise<InboundResult> {
  const receivedAt = message.timestamp ? new Date(message.timestamp) : now;
  const phone = normalizePhone(message.from);
  const lead = phone ? await prisma.lead.findUnique({ where: { phone } }) : null;

  try {
    return await prisma.$transaction(async (tx) => {
      // O evento é gravado na mesma transação: se algo falhar depois, ele não fica marcado como processado.
      await tx.webhookEvent.create({ data: { externalId: message.eventId, receivedAt: now, leadId: lead?.id ?? null } });

      if (!lead || lead.anonymizedAt) {
        await writeLog(tx, { at: now, event: "INBOUND_UNKNOWN_SENDER", detail: "Resposta de número sem lead" });
        return { status: "unknown_sender" } as const;
      }

      await tx.interaction.create({
        data: { leadId: lead.id, type: "MESSAGE_IN", body: message.text, createdAt: receivedAt },
      });

      if (isOptOut(message.text)) {
        await tx.lead.update({
          where: { id: lead.id },
          data: { optedOutAt: receivedAt, lastInboundAt: receivedAt, cycleStartedAt: null },
        });
        await tx.interaction.create({
          data: { leadId: lead.id, type: "SYSTEM", body: "Lead pediu para não receber mais mensagens (opt-out)", createdAt: now },
        });
        await cancelPendingJobs(tx, lead.id, "OPT_OUT", now);
        await writeLog(tx, { at: now, event: "OPT_OUT", detail: "Envios bloqueados", leadId: lead.id });
        return { status: "opt_out", leadId: lead.id } as const;
      }

      // RN-04: a resposta encerra o ciclo e tira da fila tudo o que ainda não saiu.
      await tx.lead.update({
        where: { id: lead.id },
        data: { lastInboundAt: receivedAt, cycleStartedAt: null },
      });
      await cancelPendingJobs(tx, lead.id, "REPLIED", now);

      const openReplyTask = await tx.task.findFirst({
        where: { leadId: lead.id, doneAt: null, createdBySystem: true, title: { startsWith: REPLY_TASK_PREFIX } },
      });
      if (!openReplyTask) {
        await tx.task.create({
          data: {
            leadId: lead.id,
            title: `${REPLY_TASK_PREFIX} ${lead.name.split(" ")[0]}: o lead escreveu`,
            dueAt: new Date(now.getTime() + REPLY_TASK_HOURS * 3600_000),
            assigneeId: lead.ownerId,
            createdBySystem: true,
          },
        });
      }
      await writeLog(tx, { at: now, event: "LEAD_REPLIED", detail: "Sequência interrompida", leadId: lead.id });
      return { status: "processed", leadId: lead.id } as const;
    });
  } catch (error) {
    // Mesmo evento chegando de novo (provedor reenviando): descarto sem reprocessar.
    if (isUniqueViolation(error, "externalId")) return { status: "duplicate" };
    throw error;
  }
}
