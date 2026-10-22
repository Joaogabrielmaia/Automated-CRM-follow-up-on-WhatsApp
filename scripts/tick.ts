import { config } from "dotenv";

config({ path: ".env" });

// Roda um ciclo de automação na linha de comando, o mesmo que o n8n dispara pela rota /api/automation/tick.
// Uso: npm run tick [-- 2026-10-23T14:00:00-03:00]  (a data opcional simula "agora")
async function main() {
  const { runAutomationCycle } = await import("../src/lib/automation/engine");
  const { prisma } = await import("../src/lib/db");
  const arg = process.argv[2];
  const now = arg ? new Date(arg) : new Date();
  if (Number.isNaN(now.getTime())) throw new Error(`Data inválida: ${arg}`);
  const summary = await runAutomationCycle(now);
  console.log(JSON.stringify(summary, null, 2));
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
