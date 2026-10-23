import { expect, test } from "@playwright/test";
import { open, ATTENDANT, loginAs, uniquePhone } from "./helpers";

// Importação da planilha (migração dos leads da Casa Nova)
test.describe("importar leads por CSV", () => {
  test("a atendente importa um arquivo, vê o relatório e os leads entram no funil pausados", async ({ page }) => {
    const suffix = Date.now();
    const a = uniquePhone();
    const b = uniquePhone();
    const csv = [
      "nome;telefone;origem;interesse;valor",
      `Importada ${suffix} A;${a.typed};Instagram;Reforma de cozinha;8.500,00`,
      `Importada ${suffix} B;${b.typed};indicacao;Pintura;`,
      `Sem telefone ${suffix};;Site;;`,
    ].join("\n");

    await loginAs(page, ATTENDANT);
    await open(page, "/funil");
    await page.getByRole("link", { name: "Importar CSV" }).click();
    await expect(page.getByRole("heading", { name: "Importar leads da planilha" })).toBeVisible();

    await page.getByLabel("Arquivo CSV").setInputFiles({ name: "leads.csv", mimeType: "text/csv", buffer: Buffer.from(csv, "utf-8") });
    await page.getByRole("button", { name: "Importar" }).click();

    const status = page.getByRole("status");
    await expect(status).toContainText("2 lead(s) importado(s).");
    await expect(status).toContainText("1 linha(s) ignorada(s)");
    await expect(status).toContainText("linha 4: Telefone ausente.");

    await open(page, "/funil");
    await page.getByRole("region", { name: /^Novo/ }).getByRole("link", { name: `Importada ${suffix} A` }).click();
    await expect(page.getByRole("heading", { level: 1, name: `Importada ${suffix} A` })).toBeVisible();
    await expect(page.getByText("Automação pausada")).toBeVisible();
    await expect(page.getByText("Importado da planilha")).toBeVisible();
  });

  test("arquivo sem as colunas obrigatórias mostra o erro e não importa nada", async ({ page }) => {
    await loginAs(page, ATTENDANT);
    await open(page, "/leads/importar");
    await page
      .getByLabel("Arquivo CSV")
      .setInputFiles({ name: "errado.csv", mimeType: "text/csv", buffer: Buffer.from("cliente;email\nAna;a@b.com", "utf-8") });
    await page.getByRole("button", { name: "Importar" }).click();
    await expect(page.locator("form").getByRole("alert")).toContainText('precisa ter as colunas "nome" e "telefone"');
  });
});
