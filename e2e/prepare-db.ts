import { execSync } from "node:child_process";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { e2eDatabaseUrl } from "./e2e-db";

// Cria o banco *_e2e, aplica as migrations, esvazia as tabelas e roda o seed de demonstração.
// Roda antes do servidor (ver webServer em playwright.config.ts), porque o Playwright sobe o
// servidor antes do globalSetup e o healthcheck dele já precisa do banco.
async function main() {
  config({ path: ".env" });
  const url = e2eDatabaseUrl(process.env.DATABASE_URL ?? "");
  if (!new URL(url).pathname.endsWith("_e2e")) throw new Error("Recusei limpar um banco que não termina em _e2e.");
  const env = { ...process.env, DATABASE_URL: url };

  execSync("npx prisma migrate deploy", { env, stdio: "pipe" });

  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
    const list = tables.map((t) => `"${t.tablename}"`).join(", ");
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
  } finally {
    await prisma.$disconnect();
  }

  execSync("npx tsx prisma/seed.ts", { env, stdio: "pipe" });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
