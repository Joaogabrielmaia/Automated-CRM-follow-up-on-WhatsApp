import type { Metadata } from "next";
import { deleteRuleAction, setRuleActiveAction } from "@/app/actions/config";
import { ActionForm } from "@/components/action-form";
import { RuleForm } from "@/components/rule-form";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { can } from "@/lib/auth/permissions";
import { requirePageUser } from "@/lib/auth/current-user";
import { getSettings } from "@/lib/services/settings";
import { listRules } from "@/lib/services/rules";
import { listTemplates } from "@/lib/services/templates";

export const metadata: Metadata = { title: "Regras" };
export const dynamic = "force-dynamic";

const TRIGGER = { NEW_LEAD: "Lead novo", NO_REPLY: "Sem resposta", QUOTE_NO_RETURN: "Orçamento sem retorno" } as const;
const ACTION = { SEND_MESSAGE: "Enviar mensagem", CREATE_TASK: "Criar tarefa", MOVE_TO_LOST: "Mover para Perdido" } as const;

function after(minutes: number): string {
  return minutes % 60 === 0 ? `${minutes / 60} h` : `${minutes} min`;
}

export default async function RulesPage() {
  const user = await requirePageUser();
  const [rules, templates, settings] = await Promise.all([listRules(), listTemplates(), getSettings()]);
  const canEdit = can(user, "rules:write");
  const open = Object.values(settings.hours).filter(Boolean).length;

  return (
    <>
      <PageHeader title="Regras de automação" subtitle={canEdit ? "Regras novas nascem desligadas. Ao ligar, valem só para o que começar depois." : "Só o Admin cria e liga regras. Você pode consultar."} />

      {rules.length === 0 && <Empty>Nenhuma regra criada ainda.</Empty>}

      <div className="space-y-4">
        {rules.map((rule) => (
          <section key={rule.id} className="card" aria-label={rule.name}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  {rule.name} {rule.active ? <Badge tone="green">Ativa</Badge> : <Badge>Inativa</Badge>}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Quando: {TRIGGER[rule.trigger]} · Depois de: {after(rule.afterMinutes)} · Ação: {ACTION[rule.action]}
                  {rule.template && ` · Modelo: ${rule.template.name}`}
                </p>
                {rule.template && <p className="mt-2 rounded-md bg-slate-50 p-2 text-sm text-slate-700">{rule.template.body}</p>}
              </div>
              {canEdit && (
                <form action={setRuleActiveAction.bind(null, rule.id, !rule.active)}>
                  <button className={rule.active ? "btn-secondary" : "btn-primary"}>{rule.active ? "Desativar" : "Ativar"}</button>
                </form>
              )}
            </div>
            {canEdit && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-brand-700">Editar regra</summary>
                <div className="mt-3">
                  <RuleForm idPrefix={rule.id} templates={templates} rule={{ ...rule, taskTitle: rule.taskTitle, lostReason: rule.lostReason }} />
                  <div className="mt-3">
                    <ActionForm action={deleteRuleAction} submitLabel="Apagar regra" variant="danger" className="space-y-2">
                      <input type="hidden" name="id" value={rule.id} />
                    </ActionForm>
                  </div>
                </div>
              </details>
            )}
          </section>
        ))}

        {canEdit && (
          <section className="card" aria-labelledby="nova-regra">
            <h2 id="nova-regra" className="mb-3 text-lg font-semibold">
              Nova regra
            </h2>
            <RuleForm idPrefix="nova" templates={templates} />
          </section>
        )}
      </div>

      <p className="mt-6 rounded-md bg-slate-100 p-3 text-sm text-slate-700">
        <strong>Vale para todas as regras:</strong> só envia em horário comercial ({open} dias com expediente), no máximo {settings.maxPerCycle} mensagens
        por lead sem resposta, intervalo mínimo de {Math.round(settings.minGapMinutes / 60)} h entre mensagens, e para de vez quando o lead responde ou pede para sair.
      </p>
    </>
  );
}
