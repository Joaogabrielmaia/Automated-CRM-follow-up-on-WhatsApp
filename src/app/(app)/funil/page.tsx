import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { MoveControl } from "@/components/move-control";
import { requirePageUser } from "@/lib/auth/current-user";
import { formatAgo, formatMoney } from "@/lib/format";
import { listBoard } from "@/lib/services/leads";

export const metadata: Metadata = { title: "Funil" };
export const dynamic = "force-dynamic";

const KIND_TONE = { OPEN: "border-t-slate-400", QUOTE: "border-t-amber-500", WON: "border-t-emerald-600", LOST: "border-t-red-500" } as const;

export default async function FunnelPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requirePageUser();
  const { q } = await searchParams;
  const now = new Date();
  const stages = await listBoard(user, q, now);
  const stageOptions = stages.map((s) => ({ id: s.id, name: s.name, kind: s.kind }));
  const total = stages.reduce((n, s) => n + s.leads.length, 0);

  return (
    <>
      <PageHeader title="Funil">
        <form role="search" className="flex gap-2">
          <label htmlFor="q" className="sr-only">
            Buscar lead
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Buscar por nome ou telefone" className="input w-56" />
          <button className="btn-secondary">Buscar</button>
        </form>
        <Link prefetch={false} href="/leads/importar" className="btn-secondary">
          Importar CSV
        </Link>
        <Link prefetch={false} href="/leads/novo" className="btn-primary">
          Novo lead
        </Link>
      </PageHeader>

      {total === 0 && <Empty>{q ? "Nenhum lead encontrado para essa busca." : "Ainda não há leads. Cadastre o primeiro."}</Empty>}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <section
            key={stage.id}
            aria-labelledby={`stage-${stage.id}`}
            className={`w-72 shrink-0 rounded-lg border border-t-4 border-slate-200 bg-slate-100 p-3 ${KIND_TONE[stage.kind]}`}
          >
            <h2 id={`stage-${stage.id}`} className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-800">
              {stage.name}
              <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-700">{stage.leads.length}</span>
            </h2>
            <ul className="space-y-3">
              {stage.leads.map((lead) => (
                <li key={lead.id} className="card p-3">
                  <Link prefetch={false} href={`/leads/${lead.id}`} className="font-medium text-slate-900 hover:underline">
                    {lead.name}
                  </Link>
                  <p className="text-sm text-slate-600">{lead.interest ?? "Sem interesse informado"}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {lead.source} · {formatMoney(lead.estimatedValue)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {lead.noReply && <Badge tone="amber">Sem resposta {formatAgo(lead.cycleStartedAt!, now).replace("há ", "há ")}</Badge>}
                    {lead.automationPaused && <Badge tone="gray">Pausado</Badge>}
                    {lead.optedOutAt && <Badge tone="red">Pediu para sair</Badge>}
                  </div>
                  <div className="mt-3">
                    <MoveControl leadId={lead.id} stages={stageOptions} currentStageId={lead.stageId} compact />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
