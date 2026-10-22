"use client";

import { loginAction } from "@/app/actions/auth";
import { ActionForm, Field } from "@/components/action-form";

export function LoginForm() {
  return (
    <ActionForm action={loginAction} submitLabel="Entrar">
      <Field label="E-mail" name="email">
        <input id="email" name="email" type="email" autoComplete="username" required className="input" />
      </Field>
      <Field label="Senha" name="password">
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
      </Field>
    </ActionForm>
  );
}
