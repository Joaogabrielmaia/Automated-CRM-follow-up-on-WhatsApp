import { z } from "zod";
import { prisma } from "@/lib/db";
import { authorize, type SessionUser } from "@/lib/auth/permissions";
import { conflict, invalid } from "@/lib/errors";
import { extractVariables } from "@/lib/rules/template";

const KNOWN = ["nome", "servico", "valor"];

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

const templateSchema = z.object({
  name: z.string().trim().min(2, "Dê um nome ao modelo").max(80),
  body: z.string().trim().min(5, "O texto está muito curto").max(1000, "O texto passou de 1000 caracteres"),
  // Nome do modelo na Meta: minúsculas, números e sublinhado.
  whatsappTemplateName: z.preprocess(
    emptyToUndefined,
    z.string().trim().regex(/^[a-z0-9_]{1,512}$/, "O nome na Meta usa só minúsculas, números e sublinhado (_)").optional(),
  ),
  whatsappLanguage: z.preprocess(
    emptyToUndefined,
    z.string().trim().regex(/^[a-z]{2}(_[A-Z]{2})?$/, "Idioma no formato pt_BR").default("pt_BR"),
  ),
});

export async function saveTemplate(
  actor: SessionUser,
  raw: { id?: string; name: string; body: string; whatsappTemplateName?: string; whatsappLanguage?: string },
) {
  authorize(actor, "templates:write");
  const parsed = templateSchema.safeParse(raw);
  if (!parsed.success) throw invalid(parsed.error.issues[0]?.message ?? "Dados inválidos");

  const unknown = extractVariables(parsed.data.body).filter((v) => !KNOWN.includes(v));
  if (unknown.length > 0) {
    throw invalid(`Variável desconhecida: {${unknown[0]}}. Use {nome}, {servico} ou {valor}.`);
  }

  const data = { ...parsed.data, whatsappTemplateName: parsed.data.whatsappTemplateName ?? null };
  if (raw.id) return prisma.messageTemplate.update({ where: { id: raw.id }, data });
  return prisma.messageTemplate.create({ data });
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
