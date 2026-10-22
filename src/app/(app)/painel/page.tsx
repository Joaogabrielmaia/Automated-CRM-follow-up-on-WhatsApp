import type { Metadata } from "next";
import { PageHeader, Stat, Empty } from "@/components/ui";
import { requirePageUser } from "@/lib/auth/current-user";
import { formatAgo, formatMoney } from "@/lib/format";
import { getDashboard } from "@/lib/services/dashboard";

export const metadata: Metadata = { title: "Painel" };
export const dynamic = "force-dynamic";

const pct = (n: number | null) => (n === null ? "—" : `${Math.round(n * 100)}%`);

export default async function DashboardPage() {
  const user = await requirePageUser();
  const now = new Date();
  const d = await getDashboard(user, now);
  const max = Math.max(1, ...d.byStage.map((s) => s.count));

  return (
    <>
      <PageHeader title="Painel" subtitle={d.lastRunAt ? `Último ciclo da automação ${formatAgo(d.lastRunAt, now)}.` : "A automação ainda não rodou."} />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Leads em aberto" value={d.openCount} />
        <Stat label="Sem resposta" value={d.noReply} />
        <Stat label="Mensagens enviadas" value={d.sent} hint="últimos 30 dias" />
        <Stat label="Falhas de envio" value={d.failed} hint="últimos 30 dias" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card" aria-labelledby="por-etapa">
          <h2 id="por-etapa" className="mb-3 text-lg font-semibold">Leads por etapa</h2>
          <ul className="space-y-2">
            {d.byStage.map((s) => (
              <li key={s.id} className="text-sm">
                <div className="flex justify-between">
                  <span>{s.name}</span>
                  <span className="text-slate-600">{s.count} · {formatMoney(s.value)}</span>
                </div>
                <div className="mt-1 h-2 rounded bg-slate-100" role="presentation">
                  <div className="h-2 rounded bg-brand-500" style={{ width: `${(s.count / max) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card" aria-labelledby="passagem">
          <h2 id="passagem" className="mb-3 text-lg font-semibold">Passagem entre etapas</h2>
          {d.conversion.length === 0 ? (
            <Empty>Ainda sem histórico suficiente.</Empty>
          ) : (
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Percentual de leads que avançaram para a etapa seguinte</caption>
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th scope="col" className="py-2">Passagem</th>
                  <th scope="col" className="py-2 text-right">Leads</th>
                  <th scope="col" className="py-2 text-right">Taxa</th>
                </tr>
              </thead>
              <tbody>
                {d.conversion.map((c) => (
                  <tr key={c.to} className="border-b border-slate-100">
                    <td className="py-2">{c.from} → {c.to}</td>
                    <td className="py-2 text-right text-slate-600">{c.toCount}/{c.fromCount}</td>
                    <td className="py-2 text-right font-medium">{pct(c.rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-2 text-xs text-slate-500">Conta os leads que já passaram pela etapa, mesmo que depois tenham saído dela.</p>
        </section>

        <section className="card" aria-labelledby="origem">
          <h2 id="origem" className="mb-3 text-lg font-semibold">Desempenho por origem</h2>
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Leads, ganhos e valor ganho por origem</caption>
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th scope="col" className="py-2">Origem</th>
                <th scope="col" className="py-2 text-right">Leads</th>
                <th scope="col" className="py-2 text-right">Ganhos</th>
                <th scope="col" className="py-2 text-right">Conversão</th>
                <th scope="col" className="py-2 text-right">Valor ganho</th>
              </tr>
            </thead>
            <tbody>
              {d.bySource.map((s) => (
                <tr key={s.source} className="border-b border-slate-100">
                  <td className="py-2">{s.source}</td>
                  <td className="py-2 text-right">{s.leads}</td>
                  <td className="py-2 text-right">{s.won}</td>
                  <td className="py-2 text-right">{pct(s.rate)}</td>
                  <td className="py-2 text-right">{formatMoney(s.wonValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card" aria-labelledby="perdas">
          <h2 id="perdas" className="mb-3 text-lg font-semibold">Motivos de perda</h2>
          {d.lostReasons.length === 0 ? (
            <Empty>Nenhum lead perdido com motivo registrado.</Empty>
          ) : (
            <ul className="space-y-1 text-sm">
              {d.lostReasons.map((r) => (
                <li key={r.reason} className="flex justify-between border-b border-slate-100 py-1">
                  <span>{r.reason}</span>
                  <span className="font-medium">{r.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
