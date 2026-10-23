import { expect, type Page } from "@playwright/test";

export const PASSWORD = "Demo@2026";
export const ADMIN = "marcos@casanova.example";
export const ATTENDANT = "camila@casanova.example";

export async function login(page: Page, email: string, password = PASSWORD) {
  await open(page, "/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

export async function loginAs(page: Page, email: string) {
  await login(page, email);
  await expect(page.getByRole("heading", { name: "O que fazer hoje" })).toBeVisible();
}

// Telefone celular válido e único por chamada, para os specs não esbarrarem na regra de telefone único (RN-13).
export function uniquePhone(): { typed: string; normalized: string } {
  const digits = String(Math.floor(Math.random() * 1e8)).padStart(8, "0");
  return { typed: `(31) 9${digits.slice(0, 4)}-${digits.slice(4)}`, normalized: `+55319${digits}` };
}

// O build de produção é rápido o bastante para o teste clicar antes de o React hidratar a página. Nesse caso o
// formulário ainda funciona (envio nativo), mas o aviso de sucesso/erro não aparece. Espero todos os formulários
// estarem hidratados antes de interagir.
export async function hydrated(page: Page) {
  await page.waitForFunction(() => {
    const forms = [...document.querySelectorAll("form")];
    return forms.length > 0 && forms.every((f) => Object.keys(f).some((k) => k.startsWith("__reactFiber")));
  });
}

export async function open(page: Page, url: string) {
  await page.goto(url);
  await hydrated(page);
}
