import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  addNoteAction,
  anonymizeLeadAction,
  archiveLeadAction,
  completeTaskAction,
  createTaskAction,
  manualContactAction,
  removeOptOutAction,
  setPausedAction,
  updateLeadAction,
} from "@/app/actions/leads";
import { ActionForm, Field } from "@/components/action-form";
import { LeadForm } from "@/components/lead-form";
import { MoveControl } from "@/components/move-control";
import { BackLink, Badge } from "@/components/ui";
import { can } from "@/lib/auth/permissions";
import { requirePageUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { formatAgo, formatDateTime, formatMoney } from "@/lib/format";
import { getLeadDetail } from "@/lib/services/leads";
import { formatPhone } from "@/lib/rules/phone";
import { describeReason } from "@/lib/services/automation-log";

export const metadata: Metadata = { title: "Lead" };
export const dynamic = "force-dynamic";

const TYPE_LABEL = {
  MESSAGE_OUT: "Enviada",
  MESSAGE_IN: "Recebida",
  NOTE: "Nota",
  STAGE_CHANGE: "Etapa",
  SYSTEM: "Sistema",
} as const;

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser();
  const { id } = await params;
  const now = new Date();
  const lead = await getLeadDetail(user, id, now);
  if (!lead) notFound();

  const [stages, owners] = await Promise.all([
    prisma.stage.findMany({ orderBy: { position: "asc" } }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const isAdmin = can(user, "leads:anonymize");

  return (
    <>
      <BackLink href="/funil">Funil</BackLink>
      <header className="card mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{lead.name}</h1>
            <p className="text-sm text-slate-600">
              {formatPhone(lead.phone)} · {lead.source} · {lead.interest ?? "sem interesse informado"} · {formatMoney(lead.estimatedValue)} · Responsável: {lead.owner?.name ?? "—"}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone="blue">{lead.stage.name}</Badge>
              {lead.noReply && <Badge tone="amber">Sem resposta {formatAgo(lead.cycleStartedAt!, now)}</Badge>}
              {lead.automationPaused && <Badge>Automação pausada</Badge>}
              {lead.optedOutAt && <Badge tone="red">Pediu para sair</Badge>}
              {lead.lostReason && <Badge tone="red">Motivo: {lead.lostReason}</Badge>}
            </div>
          </div>
          <div className="w-full sm:w-64">
            <MoveControl leadId={lead.id} stages={stages} currentStageId={lead.stageId} />
          </div>
        </div>
        {!lead.anonymizedAt && (
          <div className="mt-4 flex flex-wrap gap-2">
            <form action={setPausedAction.bind(null, lead.id, !lead.automationPaused)}>
              <button className="btn-secondary">{lead.automationPaused ? "Retomar automação" : "Pausar automação"}</button>
            </form>
            {lead.optedOutAt && isAdmin && (
              <form action={removeOptOutAction.bind(null, lead.id)}>
                <button className="btn-secondary">Remover bloqueio de envios</button>
              </form>
            )}
          </div>
        )}
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card lg:col-span-2" aria-labelledby="linha-do-tempo">
          <h2 id="linha-do-tempo" className="mb-3 text-lg font-semibold">
            Linha do tempo
          </h2>
          {lead.interactions.length === 0 ? (
            <p className="text-sm text-slate-600">Nada registrado ainda.</p>
          ) : (
            <ol className="space-y-3">
              {lead.interactions.map((i) => (
                <li key={i.id} className="border-l-2 border-slate-200 pl-3">
                  <p className="text-xs text-slate-500">
                    {formatDateTime(i.createdAt)} · {TYPE_LABEL[i.type]}
                  </p>
                  <p className={`text-sm ${i.type === "MESSAGE_IN" ? "font-medium text-emerald-900" : "text-slate-800"}`}>{i.body}</p>
                </li>
              ))}
            </ol>
          )}
        </section>

        <div className="space-y-4">
          <section className="card" aria-labelledby="automacao-lead">
            <h2 id="automacao-lead" className="mb-2 text-lg font-semibold">
              Próximo passo da automação
            </h2>
            {lead.jobs.length === 0 && lead.upcoming.length === 0 ? (
              <p className="text-sm text-slate-600">Nada agendado para este lead.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {lead.jobs.map((j) => (
                  <li key={j.id}>
                    <strong>{j.rule.name}</strong>: na fila para {formatDateTime(j.scheduledFor)}
                    {j.reason && <span className="text-slate-500"> ({describeReason(j.reason)})</span>}
                  </li>
                ))}
                {lead.upcoming.map((u) => (
                  <li key={u.ruleName}>
                    <strong>{u.ruleName}</strong>: previsto para {formatDateTime(u.at)}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card" aria-labelledby="tarefas">
            <h2 id="tarefas" className="mb-2 text-lg font-semibold">
              Tarefas
            </h2>
            <ul className="mb-3 space-y-2">
              {lead.tasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    {t.title}
                    <span className="block text-xs text-slate-500">{formatDateTime(t.dueAt)}</span>
                  </span>
                  <form action={completeTaskAction.bind(null, t.id)}>
                    <button className="btn-secondary" aria-label={`Concluir: ${t.title}`}>
                      Concluir
                    </button>
                  </form>
                </li>
              ))}
              {lead.tasks.length === 0 && <li className="text-sm text-slate-600">Nenhuma tarefa aberta.</li>}
            </ul>
            <ActionForm action={createTaskAction.bind(null, lead.id)} submitLabel="Criar tarefa" variant="secondary" resetOnSuccess>
              <Field label="Nova tarefa" name="title">
                <input id="title" name="title" required className="input" placeholder="Ligar para confirmar a visita" />
              </Field>
              <Field label="Prazo" name="dueAt">
                <input id="dueAt" name="dueAt" type="datetime-local" required className="input" />
              </Field>
            </ActionForm>
          </section>
        </div>
      </div>

      {!lead.anonymizedAt && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <section className="card">
            <h2 className="mb-2 text-lg font-semibold">Registrar contato feito fora do sistema</h2>
            <p className="mb-3 text-sm text-slate-600">
              Mandou o orçamento pelo seu WhatsApp? Registre aqui: o prazo de follow-up passa a contar desse momento.
            </p>
            <ActionForm action={manualContactAction.bind(null, lead.id)} submitLabel="Registrar contato" variant="secondary" resetOnSuccess>
              <Field label="O que foi enviado" name="body">
                <input id="body" name="body" required className="input" placeholder="Enviei o orçamento em PDF" />
              </Field>
            </ActionForm>
          </section>
          <section className="card">
            <h2 className="mb-2 text-lg font-semibold">Nota</h2>
            <ActionForm action={addNoteAction.bind(null, lead.id)} submitLabel="Salvar nota" variant="secondary" resetOnSuccess>
              <Field label="Anotação" name="note-body">
                <textarea id="note-body" name="body" required rows={2} className="input" />
              </Field>
            </ActionForm>
          </section>
          <details className="card lg:col-span-2">
            <summary className="cursor-pointer text-lg font-semibold">Editar dados do lead</summary>
            <div className="mt-4">
              <LeadForm
                action={updateLeadAction.bind(null, lead.id)}
                owners={owners}
                submitLabel="Salvar alterações"
                initial={{ name: lead.name, phone: lead.phone, source: lead.source, interest: lead.interest, estimatedValue: lead.estimatedValue, ownerId: lead.ownerId }}
              />
              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                <form action={archiveLeadAction.bind(null, lead.id)}>
                  <button className="btn-danger">Arquivar lead</button>
                </form>
                {isAdmin && (
                  <form action={anonymizeLeadAction.bind(null, lead.id)}>
                    <button className="btn-danger">Anonimizar (apaga nome, telefone e conversa)</button>
                  </form>
                )}
              </div>
            </div>
          </details>
        </div>
      )}
    </>
  );
}
