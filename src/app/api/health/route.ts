import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Dois ciclos perdidos (o n8n roda a cada 5 minutos).
const STALE_AFTER_MINUTES = 15;

// RF-19: usado pela hospedagem, pelo n8n e por mim para saber se o app e o banco estão de pé.
// "automation" diz se o agendador está vivo: ok, stale (parado há mais de 15 min), never (nunca rodou)
// ou idle (não há regra ativa, então não rodar não é problema).
// Com ?strict=1 um ciclo parado também devolve 503, para um monitor externo (UptimeRobot etc.) avisar.
export async function GET(request: Request) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const [lastRun, activeRules] = await Promise.all([
      prisma.automationRun.findFirst({ orderBy: { startedAt: "desc" }, select: { startedAt: true } }),
      prisma.automationRule.count({ where: { active: true } }),
    ]);
    const minutesSinceLastRun = lastRun ? Math.floor((Date.now() - lastRun.startedAt.getTime()) / 60_000) : null;
    const automation =
      activeRules === 0 ? "idle" : !lastRun ? "never" : minutesSinceLastRun! > STALE_AFTER_MINUTES ? "stale" : "ok";

    const strict = new URL(request.url).searchParams.get("strict") === "1";
    const failing = strict && (automation === "stale" || automation === "never");
    return NextResponse.json(
      {
        status: failing ? "automation_stale" : "ok",
        database: "ok",
        provider: process.env.MESSAGE_PROVIDER === "whatsapp-cloud" ? "whatsapp-cloud" : "simulated",
        automation,
        lastAutomationRunAt: lastRun?.startedAt ?? null,
        minutesSinceLastRun,
      },
      { status: failing ? 503 : 200 },
    );
  } catch (error) {
    console.error("[health] banco indisponível", error);
    return NextResponse.json({ status: "error", database: "down" }, { status: 503 });
  }
}
