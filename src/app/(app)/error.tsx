"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="card max-w-lg">
      <h1 className="text-lg font-semibold">Algo deu errado</h1>
      <p className="mt-2 text-sm text-slate-600">
        Não consegui carregar esta tela. Tente de novo; se continuar, avise quem cuida do sistema.
      </p>
      <button onClick={reset} className="btn-primary mt-4">
        Tentar de novo
      </button>
    </div>
  );
}
