"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/current-user";
import { authorize } from "@/lib/auth/permissions";
import { AppError } from "@/lib/errors";
import { runAutomationCycle } from "@/lib/automation/engine";
import { handleInboundMessage } from "@/lib/automation/inbound";
import { deleteRule, saveRule, setRuleActive } from "@/lib/services/rules";
import { createStage, deleteStage, moveStage, updateStage } from "@/lib/services/stages";
import { updateSettings } from "@/lib/services/settings";
import { deleteTemplate, saveTemplate } from "@/lib/services/templates";
import { DEFAULT_BUSINESS_HOURS, type BusinessHours } from "@/lib/rules/business-hours";
import { run, text, type FormState } from "./helpers";

export async function saveTemplateAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireUser();
  const result = await run(async () => {
    await saveTemplate(actor, { id: text(formData, "id") || undefined, name: text(formData, "name"), body: text(formData, "body") });
    return "Modelo salvo.";
  });
  revalidatePath("/modelos");
  return result;
}

export async function deleteTemplateAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireUser();
  const result = await run(async () => {
    await deleteTemplate(actor, text(formData, "id"));
    return "Modelo apagado.";
  });
  revalidatePath("/modelos");
  return result;
}

export async function saveRuleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireUser();
  const result = await run(async () => {
    await saveRule(actor, {
      id: text(formData, "id") || undefined,
      name: text(formData, "name"),
      trigger: text(formData, "trigger") as never,
      afterMinutes: Number(text(formData, "afterValue")) * Number(text(formData, "afterUnit") || 1),
      action: text(formData, "action") as never,
      templateId: text(formData, "templateId"),
      taskTitle: text(formData, "taskTitle"),
      lostReason: text(formData, "lostReason"),
    });
    return "Regra salva. Ela só age depois de ativada.";
  });
  revalidatePath("/regras");
  return result;
}

export async function setRuleActiveAction(ruleId: string, active: boolean) {
  const actor = await requireUser();
  try {
    await setRuleActive(actor, ruleId, active);
  } catch (error) {
    if (!(error instanceof AppError)) throw error;
  }
  revalidatePath("/regras");
}

export async function deleteRuleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireUser();
  const result = await run(async () => {
    await deleteRule(actor, text(formData, "id"));
    return "Regra apagada.";
  });
  revalidatePath("/regras");
  return result;
}

export async function runCycleAction(_prev: FormState, _formData?: FormData): Promise<FormState> {
  const actor = await requireUser();
  const result = await run(async () => {
    authorize(actor, "automation:run");
    const s = await runAutomationCycle();
    return `Ciclo executado: ${s.created} criada(s), ${s.sent} enviada(s), ${s.failed} falha(s), ${s.skipped} pulada(s), ${s.rescheduled} reagendada(s).`;
  });
  revalidatePath("/automacao");
  revalidatePath("/painel");
  return result;
}

export async function createStageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireUser();
  const result = await run(async () => {
    await createStage(actor, { name: text(formData, "name"), kind: text(formData, "kind") as never });
    return "Etapa criada.";
  });
  revalidatePath("/configuracoes");
  revalidatePath("/funil");
  return result;
}

export async function updateStageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireUser();
  const result = await run(async () => {
    await updateStage(actor, text(formData, "id"), { name: text(formData, "name"), kind: text(formData, "kind") as never });
    return "Etapa atualizada.";
  });
  revalidatePath("/configuracoes");
  revalidatePath("/funil");
  return result;
}

export async function moveStageAction(id: string, direction: "up" | "down") {
  const actor = await requireUser();
  try {
    await moveStage(actor, id, direction);
  } catch (error) {
    if (!(error instanceof AppError)) throw error;
  }
  revalidatePath("/configuracoes");
  revalidatePath("/funil");
}

export async function deleteStageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireUser();
  const result = await run(async () => {
    await deleteStage(actor, text(formData, "id"));
    return "Etapa removida.";
  });
  revalidatePath("/configuracoes");
  revalidatePath("/funil");
  return result;
}

export async function updateSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireUser();
  const result = await run(async () => {
    const hours: BusinessHours = { ...DEFAULT_BUSINESS_HOURS };
    for (const day of ["0", "1", "2", "3", "4", "5", "6"] as const) {
      const open = text(formData, `open-${day}`) === "on";
      const start = text(formData, `start-${day}`);
      const end = text(formData, `end-${day}`);
      hours[day] = open && start && end ? { start, end } : null;
    }
    await updateSettings(actor, {
      businessHours: hours,
      maxMessagesPerCycle: Number(text(formData, "maxMessagesPerCycle")),
      minGapHours: Number(text(formData, "minGapHours")),
    });
    return "Configurações salvas.";
  });
  revalidatePath("/configuracoes");
  return result;
}

// Simulador de lead (RF-17). Passa pelo mesmo handleInboundMessage que o webhook usa.
export async function simulateReplyAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireUser();
  void actor;
  return run(async () => {
    const phone = text(formData, "phone");
    const message = text(formData, "text").trim();
    if (!phone || !message) throw new AppError("Escolha o lead e escreva a mensagem.", "VALIDATION");
    const result = await handleInboundMessage({
      eventId: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      from: phone,
      text: message,
    });
    revalidatePath("/", "layout");
    if (result.status === "opt_out") return "Resposta recebida: o lead pediu para sair. Os envios dele foram bloqueados.";
    if (result.status === "processed") return "Resposta recebida: a sequência foi interrompida e a tarefa para a atendente foi criada.";
    return `Resposta recebida (${result.status}).`;
  });
}
