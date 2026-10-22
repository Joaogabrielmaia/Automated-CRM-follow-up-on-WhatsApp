// Os testes E2E recriam o banco a cada execução. Por isso usam um banco próprio (*_e2e),
// nunca o de desenvolvimento nem o dos testes de integração.
export function e2eDatabaseUrl(baseUrl: string): string {
  if (!baseUrl) throw new Error("DATABASE_URL não definida. Copie .env.example para .env.");
  const url = new URL(baseUrl);
  const name = url.pathname.replace(/^\//, "").replace(/_(test|e2e)$/, "");
  url.pathname = `/${name}_e2e`;
  return url.toString();
}
