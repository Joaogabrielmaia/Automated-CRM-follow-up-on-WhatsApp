import type { Metadata } from "next";
import {
  createStageAction,
  deleteStageAction,
  moveStageAction,
  updateSettingsAction,
  updateStageAction,
} from "@/app/actions/config";
import { ActionForm, Field } from "@/components/action-form";
import { PageHeader } from "@/components/ui";
import { can } from "@/lib/auth/permissions";
import { requirePageUser } from "@/lib/auth/current-user";
import { getSettings } from "@/lib/services/settings";
import { listStages } from "@/lib/services/stages";

export const metadata: Metadata = { title: "Configurações" };
export const dynamic = "force-dynamic";

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const KINDS = [
  ["OPEN", "Aberta"],
  ["QUOTE", "Orçamento enviado"],
  ["WON", "Ganha"],
  ["LOST", "Perdida"],
] as const;

export default async function SettingsPage() {
  const user = await requirePageUser();
  if (!can(user, "settings:write")) {
    return (
      <>
        <PageHeader title="Configurações" />
        <p className="card max-w-lg text-sm text-slate-700">Só o Admin altera etapas, horário comercial e limites.</p>
      </>
    );
  }
  const [stages, settings] = await Promise.all([listStages(), getSettings()]);

  return (
    <>
      <PageHeader title="Configurações" />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card" aria-labelledby="etapas">
          <h2 id="etapas" className="mb-1 text-lg font-semibold">Etapas do funil</h2>
          <p className="mb-3 text-sm text-slate-600">
            O tipo da etapa é o que a automação usa. Pode renomear à vontade: &ldquo;Orçamento enviado&rdquo; continua valendo como orçamento se o tipo for esse.
          </p>
          <ul className="space-y-4">
            {stages.map((stage, i) => (
              <li key={stage.id} className="rounded-md border border-slate-200 p-3">
                <ActionForm action={updateStageAction} submitLabel="Salvar" variant="secondary" className="space-y-2">
                  <input type="hidden" name="id" value={stage.id} />
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Nome" name={`n-${stage.id}`}>
                      <input id={`n-${stage.id}`} name="name" defaultValue={stage.name} required className="input" />
                    </Field>
                    <Field label="Tipo" name={`k-${stage.id}`}>
                      <select id={`k-${stage.id}`} name="kind" defaultValue={stage.kind} className="input">
                        {KINDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </Field>
                  </div>
                </ActionForm>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-slate-500">{stage._count.leads} lead(s)</span>
                  <form action={moveStageAction.bind(null, stage.id, "up")}>
                    <button className="btn-secondary" disabled={i === 0} aria-label={`Subir ${stage.name}`}>↑</button>
                  </form>
                  <form action={moveStageAction.bind(null, stage.id, "down")}>
                    <button className="btn-secondary" disabled={i === stages.length - 1} aria-label={`Descer ${stage.name}`}>↓</button>
                  </form>
                  <ActionForm action={deleteStageAction} submitLabel="Remover" variant="danger" className="inline-block">
                    <input type="hidden" name="id" value={stage.id} />
                  </ActionForm>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-slate-200 pt-4">
            <h3 className="mb-2 font-medium">Nova etapa</h3>
            <ActionForm action={createStageAction} submitLabel="Criar etapa" resetOnSuccess>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Nome" name="new-stage-name">
                  <input id="new-stage-name" name="name" required className="input" />
                </Field>
                <Field label="Tipo" name="new-stage-kind">
                  <select id="new-stage-kind" name="kind" defaultValue="OPEN" className="input">
                    {KINDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </Field>
              </div>
            </ActionForm>
          </div>
        </section>

        <section className="card" aria-labelledby="horario">
          <h2 id="horario" className="mb-1 text-lg font-semibold">Horário comercial e limites</h2>
          <p className="mb-3 text-sm text-slate-600">Fuso de Brasília. Fora desses horários, as mensagens esperam na fila.</p>
          <ActionForm action={updateSettingsAction} submitLabel="Salvar configurações">
            <ul className="space-y-2">
              {DAYS.map((label, i) => {
                const day = String(i) as "0";
                const win = settings.hours[day];
                return (
                  <li key={day} className="flex flex-wrap items-center gap-2 text-sm">
                    <label className="flex w-28 items-center gap-2">
                      <input type="checkbox" name={`open-${day}`} defaultChecked={!!win} />
                      {label}
                    </label>
                    <label className="sr-only" htmlFor={`start-${day}`}>Início {label}</label>
                    <input id={`start-${day}`} type="time" name={`start-${day}`} defaultValue={win?.start ?? "08:00"} className="input w-28" />
                    <span>às</span>
                    <label className="sr-only" htmlFor={`end-${day}`}>Fim {label}</label>
                    <input id={`end-${day}`} type="time" name={`end-${day}`} defaultValue={win?.end ?? "18:00"} className="input w-28" />
                  </li>
                );
              })}
            </ul>
            <Field label="Máximo de mensagens automáticas por lead sem resposta" name="maxMessagesPerCycle">
              <input id="maxMessagesPerCycle" name="maxMessagesPerCycle" type="number" min={1} max={10} defaultValue={settings.maxPerCycle} className="input w-28" />
            </Field>
            <Field label="Intervalo mínimo entre mensagens (horas)" name="minGapHours">
              <input id="minGapHours" name="minGapHours" type="number" min={1} max={72} step="1" defaultValue={Math.round(settings.minGapMinutes / 60)} className="input w-28" />
            </Field>
          </ActionForm>
          <p className="mt-4 text-xs text-slate-500">
            Provedor de envio: {process.env.MESSAGE_PROVIDER === "whatsapp-cloud" ? "WhatsApp Cloud API" : "simulado (nenhuma mensagem sai para o WhatsApp)"}.
          </p>
        </section>
      </div>
    </>
  );
}
