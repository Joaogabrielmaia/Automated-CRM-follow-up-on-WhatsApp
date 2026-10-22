import { logoutAction } from "@/app/actions/auth";
import { Nav } from "@/components/nav";
import { requirePageUser } from "@/lib/auth/current-user";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();
  return (
    <div className="min-h-screen lg:flex">
      <aside className="border-b border-slate-200 bg-white p-3 lg:min-h-screen lg:w-56 lg:border-b-0 lg:border-r lg:p-4">
        <div className="mb-3 flex items-center justify-between lg:mb-6 lg:block">
          <p className="text-xl font-bold text-brand-700">Pulso</p>
          <div className="text-right lg:mt-1 lg:text-left">
            <p className="text-sm font-medium text-slate-800">{user.name}</p>
            <p className="text-xs text-slate-500">{user.role === "ADMIN" ? "Admin" : "Atendente"}</p>
          </div>
        </div>
        <Nav />
        <form action={logoutAction} className="mt-3 hidden lg:block">
          <button className="btn-secondary w-full">Sair</button>
        </form>
      </aside>
      <main className="mx-auto w-full max-w-6xl flex-1 p-4 lg:p-8">
        {children}
        <form action={logoutAction} className="mt-8 lg:hidden">
          <button className="btn-secondary w-full">Sair</button>
        </form>
      </main>
    </div>
  );
}
