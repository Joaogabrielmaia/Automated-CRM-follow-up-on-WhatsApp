import { prisma } from "@/lib/db";
import { authorize, type SessionUser } from "@/lib/auth/permissions";
import { AppError, invalid } from "@/lib/errors";
import { parseLeadsCsv } from "@/lib/rules/csv";
import { createLead } from "./leads";

export const MAX_FILE_BYTES = 1_000_000;

export interface ImportResult {
  created: number;
  skipped: { line: number; message: string }[];
}

// Migração da planilha. Cada linha vira um lead pelo mesmo caminho do cadastro manual (telefone normalizado,
// único, histórico). Linha com problema é pulada e relatada; o resto segue.
//
// pauseAutomation (padrão): lead importado não é novo de verdade, então a regra "lead novo" não deve dispará-lo
// como se tivesse acabado de chegar. Fica pausado até a atendente retomar, lead a lead.
export async function importLeads(
  actor: SessionUser,
  csvText: string,
  options: { pauseAutomation?: boolean } = {},
  now: Date = new Date(),
): Promise<ImportResult> {
  authorize(actor, "leads:write");
  if (csvText.length > MAX_FILE_BYTES) throw invalid("O arquivo passou de 1 MB.");
  const pause = options.pauseAutomation ?? true;

  const parsed = parseLeadsCsv(csvText);
  const fatal = parsed.rows.length === 0 && parsed.errors.length === 1 && parsed.errors[0].line === 1;
  if (fatal) throw invalid(parsed.errors[0].message);

  const skipped = [...parsed.errors];
  let created = 0;
  for (const row of parsed.rows) {
    try {
      const lead = await createLead(
        actor,
        { name: row.name, phone: row.phone, source: row.source, interest: row.interest, estimatedValue: row.estimatedValue },
        now,
      );
      if (pause) {
        await prisma.$transaction([
          prisma.lead.update({ where: { id: lead.id }, data: { automationPaused: true } }),
          prisma.interaction.create({
            data: {
              leadId: lead.id,
              type: "SYSTEM",
              body: "Importado da planilha. A automação começa pausada; retome quando quiser.",
              createdAt: now,
            },
          }),
        ]);
      }
      created++;
    } catch (error) {
      if (!(error instanceof AppError)) throw error;
      skipped.push({ line: row.line, message: error.message });
    }
  }
  skipped.sort((a, b) => a.line - b.line);
  return { created, skipped };
}
