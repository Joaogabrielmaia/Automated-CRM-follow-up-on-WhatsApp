export interface SendMessageInput {
  to: string; // +55DDDNÚMERO
  body: string;
  idempotencyKey: string;
  // Número da tentativa, começando em 1. O provedor simulado usa para falhar só na primeira.
  attempt: number;
}

export interface SendMessageResult {
  providerMessageId: string;
}

export interface MessageProvider {
  readonly name: string;
  send(input: SendMessageInput): Promise<SendMessageResult>;
}

// retryable = true: falha passageira (instabilidade, limite de taxa). false: não adianta tentar de novo.
export class ProviderError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
