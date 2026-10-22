import { z } from "zod";
import { prisma } from "@/lib/db";
import { authorize, type SessionUser } from "@/lib/auth/permissions";
import { loadSettings } from "@/lib/domain/shared";
import { invalid } from "@/lib/errors";
import { businessHoursSchema } from "@/lib/rules/business-hours";

const settingsSchema = z.object({
  businessHours: businessHoursSchema,
  maxMessagesPerCycle: z.coerce.number().int().min(1, "O mínimo é 1").max(10, "O máximo é 10"),
  minGapHours: z.coerce.number().min(1, "O mínimo é 1 hora").max(72),
});

export function getSettings() {
  return loadSettings(prisma);
}

export async function updateSettings(actor: SessionUser, raw: z.input<typeof settingsSchema>) {
  authorize(actor, "settings:write");
  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) throw invalid(parsed.error.issues[0]?.message ?? "Dados inválidos");
  const data = {
    businessHours: parsed.data.businessHours,
    maxMessagesPerCycle: parsed.data.maxMessagesPerCycle,
    minGapMinutes: Math.round(parsed.data.minGapHours * 60),
  };
  await prisma.setting.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
}
