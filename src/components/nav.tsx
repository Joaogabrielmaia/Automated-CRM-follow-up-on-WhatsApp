"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Hoje" },
  { href: "/funil", label: "Funil" },
  { href: "/painel", label: "Painel" },
  { href: "/modelos", label: "Modelos" },
  { href: "/regras", label: "Regras" },
  { href: "/automacao", label: "Automação" },
  { href: "/simulador", label: "Simulador" },
  { href: "/configuracoes", label: "Configurações" },
];

// Feedback de carregamento da navegação. Não uso loading.tsx de propósito: a fronteira de Suspense que ele cria em
// volta das páginas fazia o Next, de vez em quando, não aplicar a tela nova depois de uma ação com revalidatePath
// (o botão ficava em "Salvando…" e o selo de Ativa/Inativa não mudava). Ver docs/03-arquitetura/adr/ADR-010.
function PendingDot() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <>
      <span aria-hidden="true" className="ml-2 inline-block h-2 w-2 animate-pulse rounded-full bg-brand-700" />
      <span className="sr-only"> carregando…</span>
    </>
  );
}

export function Nav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Principal" className="flex gap-1 overflow-x-auto lg:flex-col">
      {ITEMS.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            prefetch={false}
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ${
              active ? "bg-brand-100 text-brand-700" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            {item.label}
            <PendingDot />
          </Link>
        );
      })}
    </nav>
  );
}
