import type { Metadata } from "next";
import { createLeadAction } from "@/app/actions/leads";
import { LeadForm } from "@/components/lead-form";
import { BackLink, PageHeader } from "@/components/ui";
import { requirePageUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Novo lead" };
export const dynamic = "force-dynamic";

export default async function NewLeadPage() {
  await requirePageUser();
  const owners = await prisma.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  return (
    <>
      <BackLink href="/funil">Funil</BackLink>
      <PageHeader title="Novo lead" />
      <div className="card max-w-2xl">
        <LeadForm action={createLeadAction} owners={owners} submitLabel="Cadastrar lead" />
      </div>
    </>
  );
}
