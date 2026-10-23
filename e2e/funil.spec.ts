import { expect, test, type Page } from "@playwright/test";
import { open, ATTENDANT, loginAs, uniquePhone } from "./helpers";

async function fillLead(page: Page, name: string, phone: string) {
  await open(page, "/leads/novo");
  await page.getByLabel("Nome").fill(name);
  await page.getByLabel("Telefone").fill(phone);
  await page.getByLabel("Origem").selectOption({ label: "Instagram" });
  await page.getByLabel("Interesse").fill("Reforma de banheiro");
  await page.getByRole("button", { name: "Cadastrar lead" }).click();
}

// RF-02, RF-04, RF-06, RF-18, RN-13
test.describe("funil e leads", () => {
  test("a atendente cadastra um lead, ele aparece em Novo e vai para Perdido com motivo", async ({ page }) => {
    const name = `Teste ${Date.now()}`;
    const phone = uniquePhone();
    await loginAs(page, ATTENDANT);

    await fillLead(page, name, phone.typed);
    await expect(page).toHaveURL(/\/leads\/[^/]+$/);
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(page.getByText("Lead cadastrado por Camila")).toBeVisible();

    await open(page, "/funil");
    const novo = page.getByRole("region", { name: /^Novo/ });
    await expect(novo.getByRole("link", { name })).toBeVisible();

    await novo.getByRole("link", { name }).click();
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    await page.getByLabel("Mover para").selectOption({ label: "Perdido" });
    await page.getByLabel("Motivo da perda").fill("Fechou com outra empresa");
    await page.getByRole("button", { name: "Mover", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText("Etapa atualizada.");
    await expect(page.getByText("Motivo: Fechou com outra empresa", { exact: true })).toBeVisible();

    await open(page, "/funil");
    await expect(page.getByRole("region", { name: /^Perdido/ }).getByRole("link", { name })).toBeVisible();
  });

  test("telefone repetido, mesmo digitado de outro jeito, é recusado", async ({ page }) => {
    const phone = uniquePhone();
    await loginAs(page, ATTENDANT);

    await fillLead(page, `Primeiro ${Date.now()}`, phone.typed);
    await expect(page).toHaveURL(/\/leads\/[^/]+$/);

    await fillLead(page, `Segundo ${Date.now()}`, phone.normalized);
    await expect(page.locator("form").getByRole("alert")).toHaveText("Já existe um lead com esse telefone.");
  });

  test("telefone inválido mostra o erro em português", async ({ page }) => {
    await loginAs(page, ATTENDANT);
    await fillLead(page, `Inválido ${Date.now()}`, "123");
    await expect(page.locator("form").getByRole("alert")).toContainText("Telefone inválido");
  });

  test("busca por nome filtra o quadro e avisa quando não acha nada", async ({ page }) => {
    await loginAs(page, ATTENDANT);
    await open(page, "/funil");
    await page.getByLabel("Buscar lead").fill("Carla");
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page.getByRole("link", { name: "Carla Mendes" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Bruno Lima" })).toHaveCount(0);

    await page.getByLabel("Buscar lead").fill("zzzz");
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page.getByText("Nenhum lead encontrado para essa busca.")).toBeVisible();
  });

  test("no celular a tela inicial não rola para o lado (RNF-05)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAs(page, ATTENDANT);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
