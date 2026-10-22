import { beforeEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";
import { runAutomationCycle } from "@/lib/automation/engine";
import { MON_10H, prisma, resetDb } from "./helpers";

beforeEach(resetDb);

// RF-19
describe("healthcheck", () => {
  it("responde ok com o banco de pé e informa o provedor", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "ok", database: "ok", provider: "simulated", lastAutomationRunAt: null });
  });

  it("informa quando foi o último ciclo da automação", async () => {
    await runAutomationCycle(MON_10H);
    const body = await (await GET()).json();
    expect(new Date(body.lastAutomationRunAt)).toEqual(MON_10H);
    expect(await prisma.automationRun.count()).toBe(1);
  });
});
