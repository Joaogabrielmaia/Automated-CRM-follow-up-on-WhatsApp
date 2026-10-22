"use server";

import { redirect } from "next/navigation";
import { login, logout } from "@/lib/auth/current-user";
import type { FormState } from "./helpers";
import { text } from "./helpers";

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = text(formData, "email");
  const password = text(formData, "password");
  if (!email || !password) return { error: "Informe e-mail e senha." };
  const ok = await login(email, password);
  if (!ok) return { error: "E-mail ou senha incorretos." };
  redirect("/");
}

export async function logoutAction() {
  await logout();
  redirect("/login");
}
