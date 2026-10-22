import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readSessionToken } from "@/lib/auth/session";

// Só uma primeira barreira para mandar quem não tem sessão ao login.
// A autorização de verdade acontece nos serviços (ADR-008).
export async function middleware(request: NextRequest) {
  const user = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Fora da proteção: login, rotas de API (cada uma se protege sozinha) e arquivos estáticos.
  matcher: ["/((?!login|api|_next/static|_next/image|favicon.ico).*)"],
};
