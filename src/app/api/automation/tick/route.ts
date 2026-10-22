import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runAutomationCycle } from "@/lib/automation/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function secretMatches(received: string | null): boolean {
  const expected = process.env.AUTOMATION_SECRET;
  if (!expected || !received) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

// O n8n chama esta rota a cada 5 minutos (ADR-001). Sem o segredo certo, nada roda.
export async function POST(request: Request) {
  if (!secretMatches(request.headers.get("x-automation-secret"))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  try {
    const summary = await runAutomationCycle();
    console.log("[tick]", JSON.stringify(summary));
    return NextResponse.json(summary);
  } catch (error) {
    console.error("[tick] falhou", error);
    return NextResponse.json({ error: "Falha ao executar o ciclo" }, { status: 500 });
  }
}
