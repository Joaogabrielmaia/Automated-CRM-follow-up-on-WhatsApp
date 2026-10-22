import { config } from "dotenv";

config({ path: ".env" });

// Simula uma resposta de lead chegando, pelo mesmo caminho do webhook (RF-17).
// Uso: npm run simulate:reply -- +5511999990102 "Quero fechar"
async function main() {
  const [from, ...rest] = process.argv.slice(2);
  const text = rest.join(" ");
  if (!from || !text) throw new Error('Uso: npm run simulate:reply -- <telefone> "<texto>"');

  const { handleInboundMessage } = await import("../src/lib/automation/inbound");
  const { prisma } = await import("../src/lib/db");
  const result = await handleInboundMessage({ eventId: `cli-${Date.now()}`, from, text });
  console.log(result);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
