import { expect, test, type Page } from "@playwright/test";
import { open, ATTENDANT, loginAs } from "./helpers";

async function simulate(page: Page, phone: string, text?: string) {
  await open(page, "/simulador");
  await page.getByLabel("Lead que responde").selectOption(phone);
  if (text) await page.getByLabel("Mensagem").fill(text);
  await page.getByRole("button", { name: "Enviar resposta do lead" }).click();
}

// RF-13, RF-14, RF-17, RN-03, RN-04
test.describe("simulador de lead", () => {
  test("uma resposta interrompe a sequência e cria a tarefa Responder", async ({ page }) => {
    await loginAs(page, ATTENDANT);
    await simulate(page, "+5511999990102"); // Bruno Lima, usa a mensagem padrão

    await expect(page.getByRole("status")).toContainText("a sequência foi interrompida");

    await open(page, "/funil");
    await page.getByRole("link", { name: "Bruno Lima" }).click();
    await expect(page.getByText("Oi! Pode ser amanhã de manhã?")).toBeVisible();
    await expect(page.getByText("Responder Bruno: o lead escreveu")).toBeVisible();
  });

  test("SAIR bloqueia os envios e o lead aparece como quem pediu para sair", async ({ page }) => {
    await loginAs(page, ATTENDANT);
    await simulate(page, "+5511999990103", "sair"); // Carla Mendes

    await expect(page.getByRole("status")).toContainText("pediu para sair");

    await open(page, "/funil");
    await page.getByRole("link", { name: "Carla Mendes" }).click();
    await expect(page.getByText("Pediu para sair").first()).toBeVisible();
    // A atendente não vê o botão que só o dono tem.
    await expect(page.getByRole("button", { name: "Remover bloqueio de envios" })).toHaveCount(0);
  });
});
