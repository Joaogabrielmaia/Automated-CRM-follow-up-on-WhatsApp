import { beforeEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";
import { runAutomationCycle } from "@/lib/automation/engine";
import { MON_10H, makeRule, prisma, resetDb } from "./helpers";

beforeEach(resetDb);

const call = (query = "") => GET(new Request(`http://localhost/api/health${query}`));

// RF-19
describe("healthcheck", () => {
  it("responde ok com o banco de pé e informa o provedor", async () => {
    const response = await call();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "ok",
      database: "ok",
      provider: "simulated",
      automation: "idle",
      lastAutomationRunAt: null,
    });
  });

  it("informa quando foi o último ciclo da automação", async () => {
    await runAutomationCycle(MON_10H);
    const body = await (await call()).json();
    expect(new Date(body.lastAutomationRunAt)).toEqual(MON_10H);
    expect(await prisma.automationRun.count()).toBe(1);
  });

  it("com regra ativa e nenhum ciclo, o agendador aparece como nunca rodou", async () => {
    await makeRule({ name: "Boas-vindas", trigger: "NEW_LEAD", afterMinutes: 5 });
    expect(await (await call()).json()).toMatchObject({ automation: "never", status: "ok" });
    const strict = await call("?strict=1");
    expect(strict.status).toBe(503);
    expect(await strict.json()).toMatchObject({ status: "automation_stale" });
  });

  it("ciclo recente é ok; ciclo parado há mais de 15 minutos é stale e o modo strict devolve 503", async () => {
    await makeRule({ name: "Boas-vindas", trigger: "NEW_LEAD", afterMinutes: 5 });
    await prisma.automationRun.create({ data: { startedAt: new Date(Date.now() - 2 * 60_000) } });
    expect(await (await call("?strict=1")).json()).toMatchObject({ automation: "ok", status: "ok" });

    await prisma.automationRun.deleteMany();
    await prisma.automationRun.create({ data: { startedAt: new Date(Date.now() - 40 * 60_000) } });
    const lenient = await call();
    expect(lenient.status).toBe(200);
    expect(await lenient.json()).toMatchObject({ automation: "stale", minutesSinceLastRun: 40 });
    expect((await call("?strict=1")).status).toBe(503);
  });

  it("regra desativada não faz o ciclo parado virar problema", async () => {
    await prisma.automationRun.create({ data: { startedAt: new Date(Date.now() - 600 * 60_000) } });
    expect(await (await call("?strict=1")).json()).toMatchObject({ automation: "idle", status: "ok" });
  });
});
