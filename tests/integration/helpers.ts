import type { Prisma, RuleAction, RuleTrigger } from "@prisma/client";
import { prisma } from "@/lib/db";
import { DEFAULT_BUSINESS_HOURS } from "@/lib/rules/business-hours";
import { assertTestDatabase } from "../test-db";

export { prisma };

export const at = (iso: string) => new Date(iso);
export const addMinutes = (date: Date, minutes: number) => new Date(date.getTime() + minutes * 60_000);

// Segunda 2026-10-19 10:00 no horário de Brasília. Dentro da janela comercial (RN-01).
export const MON_10H = at("2026-10-19T13:00:00Z");

export async function resetDb(): Promise<void> {
  assertTestDatabase(process.env.DATABASE_URL);
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const list = tables.map((t) => `"${t.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

export async function baseWorld() {
  const user = await prisma.user.create({
    data: { name: "Camila Atendente", email: "camila@teste.dev", passwordHash: "x", role: "ATTENDANT" },
  });
  const stages = {
    open: await prisma.stage.create({ data: { name: "Novo", position: 0, kind: "OPEN" } }),
    quote: await prisma.stage.create({ data: { name: "Orçamento", position: 1, kind: "QUOTE" } }),
    won: await prisma.stage.create({ data: { name: "Ganho", position: 2, kind: "WON" } }),
    lost: await prisma.stage.create({ data: { name: "Perdido", position: 3, kind: "LOST" } }),
  };
  await prisma.setting.create({
    data: { id: 1, businessHours: DEFAULT_BUSINESS_HOURS as Prisma.InputJsonValue, maxMessagesPerCycle: 3, minGapMinutes: 720 },
  });
  return { user, stages };
}

export async function makeRule(opts: {
  name: string;
  trigger: RuleTrigger;
  afterMinutes: number;
  action?: RuleAction;
  body?: string;
  activatedAt?: Date;
  taskTitle?: string;
  lostReason?: string;
}) {
  const action = opts.action ?? "SEND_MESSAGE";
  const template =
    action === "SEND_MESSAGE"
      ? await prisma.messageTemplate.create({ data: { name: opts.name, body: opts.body ?? "Oi, {nome}!" } })
      : null;
  return prisma.automationRule.create({
    data: {
      name: opts.name,
      trigger: opts.trigger,
      afterMinutes: opts.afterMinutes,
      action,
      templateId: template?.id ?? null,
      taskTitle: opts.taskTitle ?? null,
      lostReason: opts.lostReason ?? null,
      active: true,
      activatedAt: opts.activatedAt ?? new Date("2026-01-01T00:00:00Z"),
    },
  });
}

let phoneSeq = 100;
export function nextPhone(suffix?: string): string {
  phoneSeq += 1;
  return suffix ? `+551199999${suffix}` : `+5511999990${phoneSeq}`;
}

export async function makeLead(opts: {
  stageId: string;
  createdAt: Date;
  name?: string;
  phone?: string;
  interest?: string | null;
  ownerId?: string | null;
  estimatedValue?: string | null;
  stageChangedAt?: Date;
  cycleStartedAt?: Date | null;
  optedOutAt?: Date | null;
  automationPaused?: boolean;
}) {
  return prisma.lead.create({
    data: {
      name: opts.name ?? "Ana Paula",
      phone: opts.phone ?? nextPhone(),
      source: "Instagram",
      interest: opts.interest === undefined ? "Limpeza" : opts.interest,
      estimatedValue: opts.estimatedValue ?? null,
      stageId: opts.stageId,
      ownerId: opts.ownerId ?? null,
      createdAt: opts.createdAt,
      stageChangedAt: opts.stageChangedAt ?? opts.createdAt,
      cycleStartedAt: opts.cycleStartedAt ?? null,
      optedOutAt: opts.optedOutAt ?? null,
      automationPaused: opts.automationPaused ?? false,
    },
  });
}

export const jobsOf = (leadId: string) =>
  prisma.automationJob.findMany({ where: { leadId }, orderBy: { createdAt: "asc" }, include: { rule: true } });
