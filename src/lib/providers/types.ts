// Modelo aprovado na Meta. Obrigatório para a primeira mensagem e fora da janela de 24h (RSK-08).
export interface TemplateSend {
  name: string;
  language: string;
  parameters: string[];
}

export interface SendMessageInput {
  to: string; // +55DDDNÚMERO
  body: string;
  template?: TemplateSend;
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
