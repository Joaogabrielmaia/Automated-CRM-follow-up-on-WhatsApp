import type { Metadata } from "next";
import { importLeadsAction } from "@/app/actions/leads";
import { ActionForm, Field } from "@/components/action-form";
import { BackLink, PageHeader } from "@/components/ui";
import { requirePageUser } from "@/lib/auth/current-user";
import { MAX_IMPORT_ROWS } from "@/lib/rules/csv";

export const metadata: Metadata = { title: "Importar leads" };
export const dynamic = "force-dynamic";

const EXAMPLE = `nome;telefone;origem;interesse;valor
Ana Paula Souza;(31) 99999-0101;Instagram;Reforma de banheiro;12.400,00
Bruno Lima;31 98888-0202;Indicação;Troca de piso;`;

export default async function ImportLeadsPage() {
  await requirePageUser();
  return (
    <>
      <BackLink href="/funil">Funil</BackLink>
      <PageHeader
        title="Importar leads da planilha"
        subtitle={`Até ${MAX_IMPORT_ROWS} leads por arquivo CSV. No Excel: Arquivo > Salvar como > CSV.`}
      />
      <div className="card max-w-2xl">
        <ActionForm action={importLeadsAction} submitLabel="Importar" resetOnSuccess>
          <Field label="Arquivo CSV" name="file" hint="Colunas: nome e telefone são obrigatórias; origem, interesse e valor são opcionais.">
            <input id="file" name="file" type="file" accept=".csv,text/csv" required className="input" />
          </Field>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" name="pause" defaultChecked className="mt-1" />
            <span>
              <strong>Começar com a automação pausada</strong> (recomendado). Os leads antigos não recebem lembrete de &ldquo;lead novo&rdquo;
              como se tivessem acabado de chegar; você retoma a automação lead a lead.
            </span>
          </label>
        </ActionForm>
      </div>
      <section className="card mt-4 max-w-2xl" aria-labelledby="formato">
        <h2 id="formato" className="mb-2 text-lg font-semibold">
          Formato do arquivo
        </h2>
        <pre className="overflow-x-auto rounded-md bg-slate-50 p-3 text-xs text-slate-800">{EXAMPLE}</pre>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>Separador <code>;</code> (padrão do Excel brasileiro) ou <code>,</code>.</li>
          <li>Telefone em qualquer formato; o Pulso padroniza e recusa repetidos.</li>
          <li>Origem: Instagram, Indicação, Anúncio, Site ou Outro (o que não reconhecer vira Outro).</li>
          <li>Valor em reais, como <code>12.400,00</code> ou <code>12400</code>.</li>
          <li>Linhas com problema são ignoradas e listadas; as demais entram.</li>
        </ul>
      </section>
    </>
  );
}
