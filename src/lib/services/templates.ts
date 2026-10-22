import { z } from "zod";
import { prisma } from "@/lib/db";
import { authorize, type SessionUser } from "@/lib/auth/permissions";
import { conflict, invalid } from "@/lib/errors";
import { extractVariables } from "@/lib/rules/template";

const KNOWN = ["nome", "servico", "valor"];

const templateSchema = z.object({
  name: z.string().trim().min(2, "Dê um nome ao modelo").max(80),
  body: z.string().trim().min(5, "O texto está muito curto").max(1000, "O texto passou de 1000 caracteres"),
});

export async function saveTemplate(actor: SessionUser, raw: { id?: string; name: string; body: string }) {
  authorize(actor, "templates:write");
  const parsed = templateSchema.safeParse(raw);
  if (!parsed.success) throw invalid(parsed.error.issues[0]?.message ?? "Dados inválidos");

  const unknown = extractVariables(parsed.data.body).filter((v) => !KNOWN.includes(v));
  if (unknown.length > 0) {
    throw invalid(`Variável desconhecida: {${unknown[0]}}. Use {nome}, {servico} ou {valor}.`);
  }

  if (raw.id) return prisma.messageTemplate.update({ where: { id: raw.id }, data: parsed.data });
  return prisma.messageTemplate.create({ data: parsed.data });
}

export async function deleteTemplate(actor: SessionUser, id: string) {
  authorize(actor, "templates:write");
  const used = await prisma.automationRule.count({ where: { templateId: id } });
  if (used > 0) throw conflict("Este modelo está em uso por uma regra. Troque o modelo da regra antes de apagar.");
  await prisma.messageTemplate.delete({ where: { id } });
}

export function listTemplates() {
  return prisma.messageTemplate.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { rules: true } } } });
}
