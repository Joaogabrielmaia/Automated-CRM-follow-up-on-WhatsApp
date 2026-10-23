import type { Metadata } from "next";
import Link from "next/link";
import { runCycleAction } from "@/app/actions/config";
import { ActionForm } from "@/components/action-form";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { can } from "@/lib/auth/permissions";
import { requirePageUser } from "@/lib/auth/current-user";
import { formatAgo, formatDateTime } from "@/lib/format";
import { EVENT_LABELS, describeReason, listAutomationLog } from "@/lib/services/automation-log";

export const metadata: Metadata = { title: "Automação" };
export const dynamic = "force-dynamic";

const TONE: Record<string, "green" | "red" | "amber" | "gray" | "blue"> = {
  MESSAGE_SENT: "green",
  JOB_FAILED: "red",
  RETRY_SCHEDULED: "amber",
  JOB_RESCHEDULED: "amber",
  JOB_SKIPPED: "gray",
  JOB_CANCELED: "gray",
  JOBS_CANCELED: "gray",
  OPT_OUT: "red",
  LEAD_REPLIED: "blue",
  LEAD_MOVED_TO_LOST: "red",
};

export default async function AutomationLogPage({ searchParams }: { searchParams: Promise<{ evento?: string; lead?: string }> }) {
  const user = await requirePageUser();
  const { evento, lead } = await searchParams;
  const { logs, queue, lastRun } = await listAutomationLog(user, { event: evento, leadId: lead });
  const now = new Date();

  return (
    <>
      <PageHeader title="Log da automação" subtitle={lastRun ? `Último ciclo ${formatAgo(lastRun.startedAt, now)}.` : "Nenhum ciclo executado ainda."} />

      {can(user, "automation:run") && (
        <div className="card mb-4">
          <p className="mb-3 text-sm text-slate-600">O n8n roda o ciclo a cada 5 minutos. Se quiser, rode agora.</p>
          <ActionForm action={runCycleAction} submitLabel="Rodar ciclo agora" variant="secondary" />
        </div>
      )}

      <section className="card mb-4" aria-labelledby="fila">
        <h2 id="fila" className="mb-2 text-lg font-semibold">
          Fila ({queue.length})
        </h2>
        {queue.length === 0 ? (
          <p className="text-sm text-slate-600">Nada esperando.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {queue.map((job) => (
              <li key={job.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>
                  <Link prefetch={false} href={`/leads/${job.lead.id}`} className="font-medium text-brand-700 hover:underline">
                    {job.lead.name}
                  </Link>{" "}
                  · {job.rule.name}
                </span>
                <span className="text-slate-600">
                  {formatDateTime(job.scheduledFor)}
                  {job.reason && ` · ${describeReason(job.reason)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card" aria-labelledby="historico">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="historico" className="text-lg font-semibold">
            Histórico
          </h2>
          <form className="flex gap-2">
            <label htmlFor="evento" className="sr-only">
              Filtrar por evento
            </label>
            <select id="evento" name="evento" defaultValue={evento ?? ""} className="input w-52">
              <option value="">Todos os eventos</option>
              {Object.entries(EVENT_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <button className="btn-secondary">Filtrar</button>
          </form>
        </div>
        {logs.length === 0 ? (
          <Empty>Nenhum registro para este filtro.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Decisões da automação, da mais recente para a mais antiga</caption>
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th scope="col" className="py-2 pr-3">Quando</th>
                  <th scope="col" className="py-2 pr-3">Evento</th>
                  <th scope="col" className="py-2 pr-3">Lead</th>
                  <th scope="col" className="py-2">Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-100 align-top">
                    <td className="whitespace-nowrap py-2 pr-3 text-slate-600">{formatDateTime(log.at)}</td>
                    <td className="py-2 pr-3">
                      <Badge tone={TONE[log.event] ?? "gray"}>{EVENT_LABELS[log.event] ?? log.event}</Badge>
                    </td>
                    <td className="py-2 pr-3">
                      {log.leadId ? (
                        <Link prefetch={false} href={`/leads/${log.leadId}`} className="text-brand-700 hover:underline">
                          {log.leadName ?? "Lead"}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 text-slate-700">{describeReason(log.detail) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
