import { config } from "dotenv";

config({ path: ".env" });

process.env.AUTH_SECRET ??= "test-auth-secret-0123456789abcdef0123456789";
process.env.AUTOMATION_SECRET ??= "test-automation-secret";
process.env.WEBHOOK_SECRET ??= "test-webhook-secret";
process.env.MESSAGE_PROVIDER = "simulated";
