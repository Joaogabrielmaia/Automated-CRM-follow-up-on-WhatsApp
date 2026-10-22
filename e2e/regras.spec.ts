import { expect, test } from "@playwright/test";
import { ADMIN, loginAs } from "./helpers";

// RF-08, RN-16, RN-17
test.describe("regras de automação", () => {
  test("o dono cria uma regra desligada e depois liga e desliga", async ({ page }) => {
    const name = `Lembrete ${Date.now()}`;
    await loginAs(page, ADMIN);
    await page.goto("/regras");

    const form = page.getByRole("region", { name: "Nova regra" });
    await form.getByLabel("Nome da regra").fill(name);
    await form.getByLabel("Quando").selectOption({ label: "Sem resposta" });
    await form.getByLabel("Depois de", { exact: true }).fill("2");
    await form.getByLabel("Unidade").selectOption({ label: "horas" });
    await form.getByLabel("Ação").selectOption({ label: "Criar tarefa para a atendente" });
    await form.getByLabel("Título da tarefa").fill("Ligar para {nome}");
    await form.getByRole("button", { name: "Criar regra" }).click();

    const rule = page.getByRole("region", { name });
    await expect(rule).toBeVisible();
    await expect(rule.getByText("Inativa", { exact: true })).toBeVisible();
    await expect(rule.getByText("Depois de: 2 h")).toBeVisible();

    await rule.getByRole("button", { name: "Ativar" }).click();
    await expect(rule.getByText("Ativa", { exact: true })).toBeVisible();

    await rule.getByRole("button", { name: "Desativar" }).click();
    await expect(rule.getByText("Inativa", { exact: true })).toBeVisible();
  });

  test("campo obrigatório da ação aparece como erro, não como tela quebrada", async ({ page }) => {
    await loginAs(page, ADMIN);
    await page.goto("/regras");
    const form = page.getByRole("region", { name: "Nova regra" });
    await form.getByLabel("Nome da regra").fill(`Sem título ${Date.now()}`);
    await form.getByLabel("Depois de", { exact: true }).fill("1");
    await form.getByLabel("Ação").selectOption({ label: "Criar tarefa para a atendente" });
    await form.getByRole("button", { name: "Criar regra" }).click();
    await expect(form.getByRole("alert")).toHaveText("Escreva o título da tarefa");
  });
});
