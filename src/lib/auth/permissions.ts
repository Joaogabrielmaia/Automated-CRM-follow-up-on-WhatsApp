import type { Role } from "@prisma/client";
import { forbidden } from "@/lib/errors";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export type Permission =
  | "leads:write"
  | "tasks:write"
  | "templates:write"
  | "leads:pause"
  | "rules:write"
  | "settings:write"
  | "leads:remove-opt-out"
  | "leads:anonymize"
  | "automation:run";

const ATTENDANT: Permission[] = ["leads:write", "tasks:write", "templates:write", "leads:pause"];

// Matriz de docs/03-arquitetura/04-seguranca-e-privacidade.md
const BY_ROLE: Record<Role, Permission[]> = {
  ATTENDANT,
  ADMIN: [
    ...ATTENDANT,
    "rules:write",
    "settings:write",
    "leads:remove-opt-out",
    "leads:anonymize",
    "automation:run",
  ],
};

export function can(user: SessionUser, permission: Permission): boolean {
  return BY_ROLE[user.role].includes(permission);
}

export function authorize(user: SessionUser, permission: Permission): void {
  if (!can(user, permission)) throw forbidden();
}
