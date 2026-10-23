import { config } from "dotenv";
import { defineConfig, devices } from "@playwright/test";
import { e2eDatabaseUrl } from "./e2e/e2e-db";

config({ path: ".env" });

const PORT = 3100; // fora da 3000 para não brigar com `npm run dev`
const databaseUrl = e2eDatabaseUrl(process.env.DATABASE_URL ?? "");

export default defineConfig({
  testDir: "e2e",
  // Os specs compartilham um banco e alguns mudam o estado dos leads de exemplo.
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure", locale: "pt-BR", timezoneId: "America/Sao_Paulo" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Build de produção: pega erro que o modo dev esconde e não tem compilação a frio.
    command: `npx tsx e2e/prepare-db.ts && npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 300_000,
    env: {
      DATABASE_URL: databaseUrl,
      NEXT_DIST_DIR: ".next-e2e",
      MESSAGE_PROVIDER: "simulated",
      NEXT_PUBLIC_DEMO_ACCOUNTS: "true",
      AUTH_SECRET: process.env.AUTH_SECRET ?? "e2e-auth-secret-0123456789abcdef0123456789",
      AUTOMATION_SECRET: process.env.AUTOMATION_SECRET ?? "e2e-automation-secret",
      WEBHOOK_SECRET: process.env.WEBHOOK_SECRET ?? "e2e-webhook-secret",
    },
  },
});
