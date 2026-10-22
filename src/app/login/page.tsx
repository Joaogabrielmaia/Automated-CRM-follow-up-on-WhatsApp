import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  const showDemo = process.env.NEXT_PUBLIC_DEMO_ACCOUNTS === "true";
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-4">
      <h1 className="text-3xl font-bold text-brand-700">Pulso</h1>
      <p className="mb-6 mt-1 text-sm text-slate-600">Funil de leads e follow-up no WhatsApp.</p>
      <div className="card">
        <LoginForm />
      </div>
      {showDemo && (
        <section aria-label="Contas de teste" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">Versão de demonstração: contas de teste</p>
          <p className="mt-1">Senha de todas: <code>Demo@2026</code></p>
          <ul className="mt-2 space-y-1">
            <li><code>marcos@casanova.example</code> (Admin)</li>
            <li><code>camila@casanova.example</code> (Atendente)</li>
          </ul>
          <p className="mt-2 text-xs">Os dados são fictícios e as mensagens não saem para ninguém.</p>
        </section>
      )}
    </main>
  );
}
