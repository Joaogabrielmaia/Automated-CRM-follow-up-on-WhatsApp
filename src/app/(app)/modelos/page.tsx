import type { Metadata } from "next";
import { deleteTemplateAction, saveTemplateAction } from "@/app/actions/config";
import { ActionForm, Field } from "@/components/action-form";
import { Empty, PageHeader } from "@/components/ui";
import { requirePageUser } from "@/lib/auth/current-user";
import { renderTemplate } from "@/lib/rules/template";
import { listTemplates } from "@/lib/services/templates";

export const metadata: Metadata = { title: "Modelos" };
export const dynamic = "force-dynamic";

const SAMPLE = { nome: "Renata Marques", servico: "reforma do banheiro", valor: 12400 };

export default async function TemplatesPage() {
  await requirePageUser();
  const templates = await listTemplates();

  return (
    <>
      <PageHeader
        title="Modelos de mensagem"
        subtitle="Use {nome}, {servico} e {valor}. Se faltar um dado do lead, a mensagem não é enviada."
      />

      {templates.length === 0 && <Empty>Nenhum modelo ainda. Crie o primeiro abaixo.</Empty>}

      <div className="space-y-4">
        {templates.map((t) => {
          const preview = renderTemplate(t.body, SAMPLE);
          return (
            <section key={t.id} className="card" aria-label={t.name}>
              <ActionForm action={saveTemplateAction} submitLabel="Salvar modelo" variant="secondary">
                <input type="hidden" name="id" value={t.id} />
                <Field label="Nome" name={`name-${t.id}`}>
                  <input id={`name-${t.id}`} name="name" defaultValue={t.name} required className="input" />
                </Field>
                <Field label="Texto" name={`body-${t.id}`}>
                  <textarea id={`body-${t.id}`} name="body" defaultValue={t.body} required rows={3} className="input" />
                </Field>
              </ActionForm>
              <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm">
                <p className="text-xs font-medium text-slate-500">Pré-visualização com a Renata (exemplo)</p>
                <p className="mt-1 text-slate-800">{preview.ok ? preview.text : `Não renderiza: falta ${preview.missing.join(", ")}`}</p>
              </div>
              <div className="mt-3">
                {t._count.rules > 0 ? (
                  <p className="text-xs text-slate-500">Em uso por {t._count.rules} regra(s).</p>
                ) : (
                  <ActionForm action={deleteTemplateAction} submitLabel="Apagar modelo" variant="danger" className="space-y-2">
                    <input type="hidden" name="id" value={t.id} />
                  </ActionForm>
                )}
              </div>
            </section>
          );
        })}

        <section className="card" aria-labelledby="novo-modelo">
          <h2 id="novo-modelo" className="mb-3 text-lg font-semibold">
            Novo modelo
          </h2>
          <ActionForm action={saveTemplateAction} submitLabel="Criar modelo" resetOnSuccess>
            <Field label="Nome" name="new-name">
              <input id="new-name" name="name" required className="input" />
            </Field>
            <Field label="Texto" name="new-body">
              <textarea id="new-body" name="body" required rows={3} className="input" placeholder="Oi, {nome}! Aqui é a Camila, da Casa Nova…" />
            </Field>
          </ActionForm>
        </section>
      </div>
    </>
  );
}
