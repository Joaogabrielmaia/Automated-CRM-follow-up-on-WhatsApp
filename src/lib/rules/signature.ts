import { createHmac, timingSafeEqual } from "node:crypto";

export function signBody(secret: string, rawBody: string): string {
  return "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
}

// ADR-007: comparo em tempo constante para não vazar o segredo pelo tempo de resposta.
export function verifySignature(secret: string, rawBody: string, header: string | null): boolean {
  if (!header) return false;
  const expected = Buffer.from(signBody(secret, rawBody));
  const received = Buffer.from(header);
  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}
