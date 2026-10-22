import type { Metadata } from "next";
import { simulateReplyAction } from "@/app/actions/config";
import { ActionForm, Field } from "@/components/action-form";
import { PageHeader } from "@/components/ui";
import { requirePageUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { formatPhone } from "@/lib/rules/phone";

export const metadata: Metadata = { title: "Simulador" };
export const dynamic = "force-dynamic";

export default async function SimulatorPage() {
  await requirePageUser();
  const leads = await prisma.lead.findMany({
    where: { archivedAt: null, stage: { kind: { in: ["OPEN", "QUOTE"] } } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, phone: true },
  });

  return (
    <>
      <PageHeader
        title="Simulador de lead"
        subtitle="Escreva como se fosse o lead respondendo no WhatsApp. O Pulso trata a mensagem do mesmo jeito que trata uma resposta recebida pelo webhook."
      />
      <div className="card max-w-xl">
        <ActionForm action={simulateReplyAction} submitLabel="Enviar resposta do lead">
          <Field label="Lead que responde" name="phone">
            <select id="phone" name="phone" required defaultValue="" className="input">
              <option value="" disabled>Escolha…</option>
              {leads.map((l) => (
                <option key={l.id} value={l.phone}>{l.name} · {formatPhone(l.phone)}</option>
              ))}
            </select>
          </Field>
          <Field label="Mensagem" name="text" hint='Teste também com "SAIR" para ver o bloqueio de envios.'>
            <textarea id="text" name="text" required rows={3} defaultValue="Oi! Pode ser amanhã de manhã?" className="input" />
          </Field>
        </ActionForm>
      </div>
      <p className="mt-4 max-w-xl text-sm text-slate-600">
        Depois de enviar, abra o lead ou o log da automação: a fila dele foi cancelada e surgiu uma tarefa &ldquo;Responder&rdquo;.
      </p>
    </>
  );
}
