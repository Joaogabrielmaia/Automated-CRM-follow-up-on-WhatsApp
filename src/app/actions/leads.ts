"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { AppError } from "@/lib/errors";
import {
  addNote,
  anonymizeLead,
  archiveLead,
  createLead,
  moveLead,
  registerManualContact,
  removeOptOut,
  setPaused,
  updateLead,
} from "@/lib/services/leads";
import { createTask, setTaskDone } from "@/lib/services/tasks";
import { parseLocalDateTime } from "@/lib/format";
import { run, text, type FormState } from "./helpers";

function leadFields(formData: FormData) {
  return {
    name: text(formData, "name"),
    phone: text(formData, "phone"),
    source: text(formData, "source") as never,
    interest: text(formData, "interest"),
    estimatedValue: text(formData, "estimatedValue"),
    ownerId: text(formData, "ownerId"),
  };
}

export async function createLeadAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireUser();
  let id: string | null = null;
  const result = await run(async () => {
    const lead = await createLead(actor, leadFields(formData));
    id = lead.id;
  });
  if (result.error || !id) return result;
  revalidatePath("/funil");
  redirect(`/leads/${id}`);
}

export async function updateLeadAction(leadId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireUser();
  const result = await run(async () => {
    await updateLead(actor, leadId, leadFields(formData));
    return "Dados atualizados.";
  });
  revalidatePath(`/leads/${leadId}`);
  return result;
}

export async function moveLeadAction(leadId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireUser();
  const result = await run(async () => {
    await moveLead(actor, leadId, text(formData, "stageId"), text(formData, "lostReason"));
    return "Etapa atualizada.";
  });
  revalidatePath("/funil");
  revalidatePath(`/leads/${leadId}`);
  return result;
}

export async function addNoteAction(leadId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireUser();
  const result = await run(async () => {
    await addNote(actor, leadId, text(formData, "body"));
    return "Nota registrada.";
  });
  revalidatePath(`/leads/${leadId}`);
  return result;
}

export async function manualContactAction(leadId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireUser();
  const result = await run(async () => {
    await registerManualContact(actor, leadId, text(formData, "body"));
    return "Contato registrado. O prazo de follow-up passa a contar a partir de agora.";
  });
  revalidatePath(`/leads/${leadId}`);
  return result;
}

export async function setPausedAction(leadId: string, paused: boolean) {
  const actor = await requireUser();
  await setPaused(actor, leadId, paused);
  revalidatePath(`/leads/${leadId}`);
}

export async function removeOptOutAction(leadId: string) {
  const actor = await requireUser();
  try {
    await removeOptOut(actor, leadId);
  } catch (error) {
    if (!(error instanceof AppError)) throw error;
  }
  revalidatePath(`/leads/${leadId}`);
}

export async function archiveLeadAction(leadId: string) {
  const actor = await requireUser();
  await archiveLead(actor, leadId);
  revalidatePath("/funil");
  redirect("/funil");
}

export async function anonymizeLeadAction(leadId: string) {
  const actor = await requireUser();
  try {
    await anonymizeLead(actor, leadId);
  } catch (error) {
    if (!(error instanceof AppError)) throw error;
  }
  revalidatePath("/funil");
  redirect("/funil");
}

export async function createTaskAction(leadId: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireUser();
  const result = await run(async () => {
    const dueAt = parseLocalDateTime(text(formData, "dueAt"));
    await createTask(actor, {
      leadId: leadId ?? undefined,
      title: text(formData, "title"),
      dueAt: dueAt as Date,
    });
    return "Tarefa criada.";
  });
  revalidatePath("/");
  if (leadId) revalidatePath(`/leads/${leadId}`);
  return result;
}

export async function completeTaskAction(taskId: string) {
  const actor = await requireUser();
  await setTaskDone(actor, taskId, true);
  revalidatePath("/");
  revalidatePath("/leads/[id]", "page");
}
