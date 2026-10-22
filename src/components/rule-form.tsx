"use client";

import { useState } from "react";
import { saveRuleAction } from "@/app/actions/config";
import { ActionForm, Field } from "./action-form";

interface RuleValues {
  id?: string;
  name: string;
  trigger: string;
  afterMinutes: number;
  action: string;
  templateId: string | null;
  taskTitle: string | null;
  lostReason: string | null;
}

const EMPTY: RuleValues = { name: "", trigger: "NO_REPLY", afterMinutes: 1440, action: "SEND_MESSAGE", templateId: null, taskTitle: null, lostReason: null };

export function RuleForm({ templates, rule, idPrefix }: { templates: { id: string; name: string }[]; rule?: RuleValues; idPrefix: string }) {
  const initial = rule ?? EMPTY;
  const [action, setAction] = useState(initial.action);
  const inHours = initial.afterMinutes % 60 === 0;
  const p = (name: string) => `${idPrefix}-${name}`;

  return (
    <ActionForm action={saveRuleAction} submitLabel={rule ? "Salvar regra" : "Criar regra"} variant={rule ? "secondary" : "primary"} resetOnSuccess={!rule}>
      {rule?.id && <input type="hidden" name="id" value={rule.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nome da regra" name={p("name")}>
          <input id={p("name")} name="name" required defaultValue={initial.name} className="input" />
        </Field>
        <Field label="Quando" name={p("trigger")}>
          <select id={p("trigger")} name="trigger" defaultValue={initial.trigger} className="input">
            <option value="NEW_LEAD">Lead novo</option>
            <option value="NO_REPLY">Sem resposta</option>
            <option value="QUOTE_NO_RETURN">Orçamento sem retorno</option>
          </select>
        </Field>
        <div className="flex gap-2">
          <Field label="Depois de" name={p("afterValue")}>
            <input
              id={p("afterValue")}
              name="afterValue"
              type="number"
              min={1}
              required
              defaultValue={inHours ? initial.afterMinutes / 60 : initial.afterMinutes}
              className="input"
            />
          </Field>
          <Field label="Unidade" name={p("afterUnit")}>
            <select id={p("afterUnit")} name="afterUnit" defaultValue={inHours ? "60" : "1"} className="input">
              <option value="1">minutos</option>
              <option value="60">horas</option>
            </select>
          </Field>
        </div>
        <Field label="Ação" name={p("action")}>
          <select id={p("action")} name="action" value={action} onChange={(e) => setAction(e.target.value)} className="input">
            <option value="SEND_MESSAGE">Enviar mensagem</option>
            <option value="CREATE_TASK">Criar tarefa para a atendente</option>
            <option value="MOVE_TO_LOST">Mover para Perdido</option>
          </select>
        </Field>
      </div>
      {action === "SEND_MESSAGE" && (
        <Field label="Modelo de mensagem" name={p("templateId")}>
          <select id={p("templateId")} name="templateId" defaultValue={initial.templateId ?? ""} className="input">
            <option value="">Escolha…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      {action === "CREATE_TASK" && (
        <Field label="Título da tarefa" name={p("taskTitle")} hint="Pode usar {nome}.">
          <input id={p("taskTitle")} name="taskTitle" defaultValue={initial.taskTitle ?? ""} className="input" />
        </Field>
      )}
      {action === "MOVE_TO_LOST" && (
        <Field label="Motivo da perda" name={p("lostReason")}>
          <input id={p("lostReason")} name="lostReason" defaultValue={initial.lostReason ?? ""} className="input" />
        </Field>
      )}
    </ActionForm>
  );
}
