import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { handleInboundMessage } from "@/lib/automation/inbound";
import { verifySignature } from "@/lib/rules/signature";

export const dynamic = "force-dynamic";

// Entrada nativa da WhatsApp Cloud API (ADR-007 revisto): a Meta chama esta rota direto, sem adaptador.
// O app na Vercel já é público, então não precisa de n8n com endereço aberto para receber respostas.
//
// GET  = verificação do webhook (a Meta confere hub.verify_token e espera o hub.challenge de volta).
// POST = eventos, assinados com HMAC-SHA256 do corpo bruto usando o segredo do app Meta (X-Hub-Signature-256).

function tokenMatches(received: string | null): boolean {
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!expected || !received) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  if (params.get("hub.mode") === "subscribe" && tokenMatches(params.get("hub.verify_token"))) {
    return new Response(params.get("hub.challenge") ?? "", { status: 200 });
  }
  return NextResponse.json({ error: "Verificação recusada" }, { status: 403 });
}

const messageSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  timestamp: z.string().optional(),
  type: z.string().default("unknown"),
  text: z.object({ body: z.string() }).optional(),
  button: z.object({ text: z.string() }).optional(),
  interactive: z
    .object({
      button_reply: z.object({ title: z.string() }).optional(),
      list_reply: z.object({ title: z.string() }).optional(),
    })
    .optional(),
});

const payloadSchema = z.object({
  entry: z
    .array(
      z.object({
        changes: z
          .array(z.object({ value: z.object({ messages: z.array(messageSchema).optional() }).passthrough() }).passthrough())
          .default([]),
      }),
    )
    .default([]),
});

// Qualquer resposta interrompe a sequência (RN-04), inclusive áudio e imagem. Só o texto pode ser SAIR (RN-03).
function textOf(message: z.infer<typeof messageSchema>): string {
  return (
    message.text?.body ??
    message.button?.text ??
    message.interactive?.button_reply?.title ??
    message.interactive?.list_reply?.title ??
    `[${message.type}]`
  );
}

export async function POST(request: Request) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) {
    console.error("[webhook-meta] WHATSAPP_APP_SECRET não configurado");
    return NextResponse.json({ error: "Webhook não configurado" }, { status: 500 });
  }

  const raw = await request.text();
  if (!verifySignature(secret, raw, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Payload inválido" }, { status: 400 });

  // Eventos de status (entregue, lida) chegam sem "messages" e são ignorados com 200, para a Meta não reenviar.
  const messages = parsed.data.entry.flatMap((e) => e.changes.flatMap((c) => c.value.messages ?? []));
  try {
    for (const message of messages) {
      await handleInboundMessage({
        eventId: message.id,
        from: message.from,
        text: textOf(message).slice(0, 2000),
        timestamp: message.timestamp ? new Date(Number(message.timestamp) * 1000).toISOString() : undefined,
      });
    }
    return NextResponse.json({ received: messages.length });
  } catch (error) {
    // 500 faz a Meta tentar de novo; o eventId único garante que o que já foi processado não duplica.
    console.error("[webhook-meta] falhou", error);
    return NextResponse.json({ error: "Falha ao processar" }, { status: 500 });
  }
}
