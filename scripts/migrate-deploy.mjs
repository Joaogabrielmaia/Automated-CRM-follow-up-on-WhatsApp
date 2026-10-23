// Aplica as migrations no deploy. Migration por conexão "pooled" (pgbouncer) pode travar, porque o Prisma
// usa um bloqueio que o pooler não repassa. Se DIRECT_URL existir (URL direta do Neon), uso ela só aqui;
// o app em execução continua usando DATABASE_URL (a do pooler).
import { spawnSync } from "node:child_process";

const env = { ...process.env };
if (env.DIRECT_URL) {
  env.DATABASE_URL = env.DIRECT_URL;
  console.log("[migrate] usando DIRECT_URL (conexão direta)");
} else {
  console.log("[migrate] DIRECT_URL não definida; usando DATABASE_URL");
}

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], { env, stdio: "inherit", shell: process.platform === "win32" });
process.exit(result.status ?? 1);
