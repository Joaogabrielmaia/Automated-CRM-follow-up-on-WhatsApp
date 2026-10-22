import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// RF-19: usado pela hospedagem, pelo n8n e por mim para saber se o app e o banco estão de pé.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const lastRun = await prisma.automationRun.findFirst({ orderBy: { startedAt: "desc" }, select: { startedAt: true } });
    return NextResponse.json({
      status: "ok",
      database: "ok",
      provider: process.env.MESSAGE_PROVIDER === "whatsapp-cloud" ? "whatsapp-cloud" : "simulated",
      lastAutomationRunAt: lastRun?.startedAt ?? null,
    });
  } catch (error) {
    console.error("[health] banco indisponível", error);
    return NextResponse.json({ status: "error", database: "down" }, { status: 503 });
  }
}
