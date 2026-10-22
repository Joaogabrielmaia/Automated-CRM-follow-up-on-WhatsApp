"use client";

import { useState } from "react";
import { moveLeadAction } from "@/app/actions/leads";
import { ActionForm } from "./action-form";

interface StageOption {
  id: string;
  name: string;
  kind: string;
}

// Seletor "Mover para". Se a etapa escolhida for de perda, pede o motivo antes de enviar (RF-18).
export function MoveControl({
  leadId,
  stages,
  currentStageId,
  compact,
}: {
  leadId: string;
  stages: StageOption[];
  currentStageId: string;
  compact?: boolean;
}) {
  const [selected, setSelected] = useState(currentStageId);
  const needsReason = stages.find((s) => s.id === selected)?.kind === "LOST";
  const id = `stage-${leadId}`;

  return (
    <ActionForm
      action={moveLeadAction.bind(null, leadId)}
      submitLabel="Mover"
      variant="secondary"
      className={compact ? "space-y-2" : "space-y-3"}
    >
      <div>
        <label htmlFor={id} className={compact ? "sr-only" : "label"}>
          Mover para
        </label>
        <select
          id={id}
          name="stageId"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="input"
        >
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      {needsReason && (
        <div>
          <label htmlFor={`${id}-reason`} className={compact ? "sr-only" : "label"}>
            Motivo da perda
          </label>
          <input
            id={`${id}-reason`}
            name="lostReason"
            required
            minLength={3}
            placeholder="Motivo da perda"
            className="input"
          />
        </div>
      )}
    </ActionForm>
  );
}
