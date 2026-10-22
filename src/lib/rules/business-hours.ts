import { z } from "zod";

// Brasil sem horário de verão desde 2019: America/Sao_Paulo é UTC-3 o ano todo (ADR-004).
const OFFSET_MS = -3 * 60 * 60 * 1000;

const timeWindow = z
  .object({
    start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  })
  .refine((w) => w.start < w.end, "O fim precisa ser depois do início");

// Chaves "0" a "6" (domingo a sábado); null = fechado.
export const businessHoursSchema = z.record(z.enum(["0", "1", "2", "3", "4", "5", "6"]), timeWindow.nullable());

export type BusinessHours = z.infer<typeof businessHoursSchema>;

export const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  "0": null,
  "1": { start: "08:00", end: "18:00" },
  "2": { start: "08:00", end: "18:00" },
  "3": { start: "08:00", end: "18:00" },
  "4": { start: "08:00", end: "18:00" },
  "5": { start: "08:00", end: "18:00" },
  "6": { start: "08:00", end: "12:00" },
};

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function localParts(date: Date) {
  const local = new Date(date.getTime() + OFFSET_MS);
  return {
    year: local.getUTCFullYear(),
    month: local.getUTCMonth(),
    day: local.getUTCDate(),
    weekday: local.getUTCDay(),
    minutes: local.getUTCHours() * 60 + local.getUTCMinutes(),
  };
}

function localToUtc(year: number, month: number, day: number, hhmm: string): Date {
  const minutes = toMinutes(hhmm);
  return new Date(Date.UTC(year, month, day, Math.floor(minutes / 60), minutes % 60) - OFFSET_MS);
}

// O fim da janela é exclusivo: às 18:00 em ponto já está fechado.
export function isWithinBusinessHours(date: Date, hours: BusinessHours): boolean {
  const { weekday, minutes } = localParts(date);
  const win = hours[String(weekday) as keyof BusinessHours];
  if (!win) return false;
  return minutes >= toMinutes(win.start) && minutes < toMinutes(win.end);
}

// RN-02: dentro da janela devolve a própria data; fora, o início da próxima janela.
export function nextSendableTime(date: Date, hours: BusinessHours): Date {
  if (isWithinBusinessHours(date, hours)) return date;
  const { year, month, day } = localParts(date);
  for (let offset = 0; offset <= 7; offset++) {
    const probe = new Date(Date.UTC(year, month, day + offset));
    const win = hours[String(probe.getUTCDay()) as keyof BusinessHours];
    if (!win) continue;
    const start = localToUtc(probe.getUTCFullYear(), probe.getUTCMonth(), probe.getUTCDate(), win.start);
    if (start.getTime() > date.getTime()) return start;
  }
  // Configuração sem nenhum dia aberto: não há como agendar, devolvo a data original.
  return date;
}
