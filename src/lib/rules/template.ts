export interface TemplateVars {
  nome: string | null;
  servico: string | null;
  valor: number | null;
}

export type RenderResult = { ok: true; text: string } | { ok: false; missing: string[] };

const KNOWN = ["nome", "servico", "valor"] as const;
type VarName = (typeof KNOWN)[number];

export function extractVariables(body: string): string[] {
  return [...body.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
}

export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function valueOf(name: VarName, vars: TemplateVars): string | null {
  if (name === "nome") return vars.nome ? vars.nome.split(" ")[0] : null;
  if (name === "servico") return vars.servico?.trim() ? vars.servico.trim() : null;
  return vars.valor != null ? formatCurrency(vars.valor) : null;
}

// RN-14: se faltar qualquer variável, não devolvo texto. Nunca sai "{valor}" cru para o cliente.
export function renderTemplate(body: string, vars: TemplateVars): RenderResult {
  const missing: string[] = [];
  const text = body.replace(/\{(\w+)\}/g, (_, name: string) => {
    if (!(KNOWN as readonly string[]).includes(name)) {
      missing.push(name);
      return "";
    }
    const value = valueOf(name as VarName, vars);
    if (value === null) missing.push(name);
    return value ?? "";
  });
  return missing.length > 0 ? { ok: false, missing: [...new Set(missing)] } : { ok: true, text };
}
