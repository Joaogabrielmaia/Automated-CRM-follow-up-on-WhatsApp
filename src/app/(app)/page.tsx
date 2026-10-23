import type { Metadata } from "next";
import Link from "next/link";
import { completeTaskAction } from "@/app/actions/leads";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { requirePageUser } from "@/lib/auth/current-user";
import { formatAgo, formatDateTime } from "@/lib/format";
import { getTodayView } from "@/lib/services/tasks";

export const metadata: Metadata = { title: "Hoje" };
export const dynamic = "force-dynamic";

type TaskRow = Awaited<ReturnType<typeof getTodayView>>["today"][number];

function TaskList({ tasks, overdue }: { tasks: TaskRow[]; overdue?: boolean }) {
  return (
    <ul className="divide-y divide-slate-100">
      {tasks.map((task) => (
        <li key={task.id} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="font-medium text-slate-900">{task.title}</p>
            <p className="text-sm text-slate-600">
              {task.lead && (
                <Link prefetch={false} href={`/leads/${task.lead.id}`} className="text-brand-700 hover:underline">
                  {task.lead.name}
                </Link>
              )}
              {task.lead && " · "}
              <span className={overdue ? "font-medium text-red-700" : ""}>{formatDateTime(task.dueAt)}</span>
              {task.createdBySystem && " · criada pela automação"}
            </p>
          </div>
          <form action={completeTaskAction.bind(null, task.id)}>
            <button className="btn-secondary" aria-label={`Concluir: ${task.title}`}>
              Concluir
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}

export default async function TodayPage() {
  const user = await requirePageUser();
  const now = new Date();
  const view = await getTodayView(user, now);
  const nothing = view.overdue.length + view.today.length + view.noReply.length === 0;

  return (
    <>
      <PageHeader title="O que fazer hoje" subtitle="Tarefas atrasadas, as de hoje e os leads que ainda não responderam.">
        <Link prefetch={false} href="/leads/novo" className="btn-primary">
          Novo lead
        </Link>
      </PageHeader>

      {nothing && <Empty>Nada pendente por enquanto. Quando um lead responder ou uma tarefa vencer, ela aparece aqui.</Empty>}

      {view.overdue.length > 0 && (
        <section className="card mb-4" aria-labelledby="atrasadas">
          <h2 id="atrasadas" className="mb-1 text-lg font-semibold text-red-800">
            Atrasadas ({view.overdue.length})
          </h2>
          <TaskList tasks={view.overdue} overdue />
        </section>
      )}

      {view.today.length > 0 && (
        <section className="card mb-4" aria-labelledby="hoje">
          <h2 id="hoje" className="mb-1 text-lg font-semibold">
            Para hoje ({view.today.length})
          </h2>
          <TaskList tasks={view.today} />
        </section>
      )}

      {view.noReply.length > 0 && (
        <section className="card mb-4" aria-labelledby="sem-resposta">
          <h2 id="sem-resposta" className="mb-1 text-lg font-semibold">
            Sem resposta ({view.noReply.length})
          </h2>
          <ul className="divide-y divide-slate-100">
            {view.noReply.map((lead) => (
              <li key={lead.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <Link prefetch={false} href={`/leads/${lead.id}`} className="font-medium text-brand-700 hover:underline">
                    {lead.name}
                  </Link>
                  <p className="text-sm text-slate-600">
                    {lead.stage.name} · último contato nosso {formatAgo(lead.cycleStartedAt!, now)}
                  </p>
                </div>
                {lead.automationPaused && <Badge tone="amber">Pausado</Badge>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {view.upcoming.length > 0 && (
        <section className="card" aria-labelledby="proximas">
          <h2 id="proximas" className="mb-1 text-lg font-semibold">
            Próximas ({view.upcoming.length})
          </h2>
          <TaskList tasks={view.upcoming.slice(0, 10)} />
        </section>
      )}
    </>
  );
}
