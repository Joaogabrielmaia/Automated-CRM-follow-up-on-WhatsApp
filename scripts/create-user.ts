import { config } from "dotenv";

config({ path: ".env" });

// Cria uma conta de verdade (o seed só cria contas de demonstração, com senha pública).
// A senha vem do ambiente para não ficar no histórico do terminal.
// Uso (PowerShell): $env:PULSO_NEW_PASSWORD="..."; npm run user:create -- camila@empresa.com "Camila" ATTENDANT
async function main() {
  const [rawEmail, name, role] = process.argv.slice(2);
  const password = process.env.PULSO_NEW_PASSWORD;
  if (!rawEmail || !name || (role !== "ADMIN" && role !== "ATTENDANT") || !password) {
    throw new Error('Uso: PULSO_NEW_PASSWORD=... npm run user:create -- <email> "<Nome>" <ADMIN|ATTENDANT>');
  }
  if (password.length < 10) throw new Error("A senha precisa ter pelo menos 10 caracteres.");
  if (password === "Demo@2026") throw new Error("Essa é a senha pública da demonstração. Escolha outra.");

  const { prisma } = await import("../src/lib/db");
  const { hashPassword } = await import("../src/lib/auth/password");
  const email = rawEmail.trim().toLowerCase();
  if (await prisma.user.findUnique({ where: { email } })) throw new Error(`Já existe uma conta com ${email}.`);

  await prisma.user.create({ data: { email, name: name.trim(), role, passwordHash: await hashPassword(password) } });
  console.log(`Conta criada: ${email} (${role === "ADMIN" ? "Admin" : "Atendente"}).`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
