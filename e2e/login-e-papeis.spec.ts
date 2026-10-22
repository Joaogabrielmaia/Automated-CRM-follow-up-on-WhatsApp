import { expect, test } from "@playwright/test";
import { ADMIN, ATTENDANT, login, loginAs } from "./helpers";

// RF-01, RNF-03
test.describe("login e papéis", () => {
  test("quem não tem sessão é mandado ao login", async ({ page }) => {
    await page.goto("/funil");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  });

  test("senha errada mostra mensagem e não entra", async ({ page }) => {
    await login(page, ATTENDANT, "senha-errada");
    await expect(page.locator("form").getByRole("alert")).toHaveText("E-mail ou senha incorretos.");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("a atendente consulta as regras mas não vê como criar nem ligar", async ({ page }) => {
    await loginAs(page, ATTENDANT);
    await page.goto("/regras");
    await expect(page.getByText("Só o Admin cria e liga regras")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Nova regra" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^(Ativar|Desativar)$/ })).toHaveCount(0);
  });

  test("o dono vê o formulário de nova regra", async ({ page }) => {
    await loginAs(page, ADMIN);
    await page.goto("/regras");
    await expect(page.getByRole("heading", { name: "Nova regra" })).toBeVisible();
  });

  test("sair encerra a sessão", async ({ page }) => {
    await loginAs(page, ATTENDANT);
    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/funil");
    await expect(page).toHaveURL(/\/login$/);
  });
});
