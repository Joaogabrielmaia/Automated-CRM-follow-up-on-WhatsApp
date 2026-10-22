import { ActionForm, Field } from "./action-form";
import type { FormState } from "@/app/actions/helpers";

const SOURCES = ["Instagram", "Indicação", "Anúncio", "Site", "Outro"];

interface Props {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  owners: { id: string; name: string }[];
  submitLabel: string;
  initial?: { name: string; phone: string; source: string; interest: string | null; estimatedValue: number | null; ownerId: string | null };
}

export function LeadForm({ action, owners, submitLabel, initial }: Props) {
  return (
    <ActionForm action={action} submitLabel={submitLabel} className="grid gap-4 sm:grid-cols-2">
      <Field label="Nome" name="name">
        <input id="name" name="name" required minLength={2} defaultValue={initial?.name} className="input" />
      </Field>
      <Field label="Telefone" name="phone" hint="DDD + número. Ex.: (31) 90000-0101">
        <input id="phone" name="phone" required inputMode="tel" defaultValue={initial?.phone} className="input" />
      </Field>
      <Field label="Origem" name="source">
        <select id="source" name="source" required defaultValue={initial?.source ?? ""} className="input">
          <option value="" disabled>
            Escolha…
          </option>
          {SOURCES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="Interesse" name="interest" hint="Ex.: reforma do banheiro">
        <input id="interest" name="interest" defaultValue={initial?.interest ?? ""} className="input" />
      </Field>
      <Field label="Valor estimado (R$)" name="estimatedValue">
        <input id="estimatedValue" name="estimatedValue" type="number" min="0" step="0.01" defaultValue={initial?.estimatedValue ?? ""} className="input" />
      </Field>
      <Field label="Responsável" name="ownerId">
        <select id="ownerId" name="ownerId" defaultValue={initial?.ownerId ?? ""} className="input">
          <option value="">Eu mesmo</option>
          {owners.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </Field>
    </ActionForm>
  );
}
