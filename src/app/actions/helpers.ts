import { AppError } from "@/lib/errors";

export interface FormState {
  error?: string;
  ok?: string;
}

// Transforma o erro esperado de um serviço (permissão, validação, conflito) em mensagem para a tela.
// Erros inesperados continuam subindo para a página de erro.
export async function run(fn: () => Promise<string | void>): Promise<FormState> {
  try {
    const message = await fn();
    return { ok: message ?? "Salvo." };
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
}

export function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
