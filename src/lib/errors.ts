export class AppError extends Error {
  constructor(
    message: string,
    readonly code: "FORBIDDEN" | "NOT_FOUND" | "VALIDATION" | "CONFLICT" | "UNAUTHENTICATED",
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const forbidden = (message = "Você não tem permissão para fazer isso.") => new AppError(message, "FORBIDDEN");
export const notFound = (message = "Não encontrei o que você procurou.") => new AppError(message, "NOT_FOUND");
export const invalid = (message: string) => new AppError(message, "VALIDATION");
export const conflict = (message: string) => new AppError(message, "CONFLICT");
export const unauthenticated = () => new AppError("Faça login para continuar.", "UNAUTHENTICATED");
