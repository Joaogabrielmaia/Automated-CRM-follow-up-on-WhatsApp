"use client";

import { useActionState, useEffect, useRef } from "react";
import type { FormState } from "@/app/actions/helpers";

interface Props {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  children?: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  variant?: "primary" | "secondary" | "danger";
}

// Formulário com estado de envio, erro e sucesso. Usado por quase todas as telas.
export function ActionForm({ action, submitLabel, children, className, resetOnSuccess, variant = "primary" }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} className={className ?? "space-y-3"}>
      {children}
      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {state.ok}
        </p>
      )}
      <button type="submit" disabled={pending} className={`btn-${variant}`}>
        {pending ? "Salvando…" : submitLabel}
      </button>
    </form>
  );
}

export function Field({
  label,
  name,
  children,
  hint,
}: {
  label: string;
  name: string;
  children?: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="label">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
