import { execSync } from "node:child_process";
import { config } from "dotenv";
import { testDatabaseUrl } from "./test-db";

// Cria o banco *_test (se não existir) e aplica as migrations antes de qualquer teste.
// Os testes unitários passam por aqui também, mas sem DATABASE_URL não há o que preparar.
export default function setup() {
  config({ path: ".env" });
  if (!process.env.DATABASE_URL) return;
  const url = testDatabaseUrl(process.env.DATABASE_URL);
  try {
    execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  } catch {
    // Banco fora do ar: os unitários seguem rodando; os de integração falham com a mensagem de conexão.
    console.warn("Não consegui preparar o banco de testes (rode `npm run db:up`).");
  }
}
