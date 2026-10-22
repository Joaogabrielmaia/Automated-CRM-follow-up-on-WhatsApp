import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { unauthenticated } from "@/lib/errors";
import { verifyPassword } from "./password";
import type { SessionUser } from "./permissions";
import { SESSION_COOKIE, SESSION_HOURS, createSessionToken, readSessionToken } from "./session";

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const user = await readSessionToken(store.get(SESSION_COOKIE)?.value);
  if (!user) return null;
  // Confere no banco para uma conta desativada perder o acesso antes de a sessão expirar.
  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { active: true, role: true } });
  if (!row?.active) return null;
  return { ...user, role: row.role };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw unauthenticated();
  return user;
}

// Para páginas: sem sessão, manda para o login em vez de mostrar erro.
export async function requirePageUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function login(email: string, password: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  // Compara mesmo quando o usuário não existe, para o tempo de resposta não revelar quais e-mails existem.
  const hash = user?.passwordHash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinva";
  const ok = await verifyPassword(password, hash);
  if (!user || !ok || !user.active) return false;

  const token = await createSessionToken({ id: user.id, name: user.name, email: user.email, role: user.role });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_HOURS * 60 * 60,
  });
  return true;
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
