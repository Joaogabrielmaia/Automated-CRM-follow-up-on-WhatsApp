// Os testes de integração apagam dados. Por isso nunca rodam no banco de desenvolvimento:
// a URL do .env é reescrita para um banco com sufixo _test, criado pelo `prisma migrate deploy`.
export function testDatabaseUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  const name = url.pathname.replace(/^\//, "");
  if (!name.endsWith("_test")) url.pathname = `/${name}_test`;
  return url.toString();
}

export function assertTestDatabase(url: string | undefined): void {
  if (!url || !new URL(url).pathname.endsWith("_test")) {
    throw new Error("Recusei limpar o banco: DATABASE_URL dos testes precisa apontar para um banco *_test.");
  }
}
