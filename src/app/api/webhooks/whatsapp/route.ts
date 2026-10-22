import { NextResponse } from "next/server";
import { handleInboundMessage, inboundSchema } from "@/lib/automation/inbound";
import { verifySignature } from "@/lib/rules/signature";

export const dynamic = "force-dynamic";

// Resposta do lead (ADR-007). A assinatura é conferida sobre o corpo bruto, antes de qualquer parse.
export async function POST(request: Request) {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook] WEBHOOK_SECRET não configurado");
    return NextResponse.json({ error: "Webhook não configurado" }, { status: 500 });
  }

  const raw = await request.text();
  if (!verifySignature(secret, raw, request.headers.get("x-pulso-signature"))) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = inboundSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido", issues: parsed.error.issues.map((i) => i.message) }, { status: 400 });
  }

  try {
    const result = await handleInboundMessage(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[webhook] falhou", error);
    return NextResponse.json({ error: "Falha ao processar" }, { status: 500 });
  }
}
