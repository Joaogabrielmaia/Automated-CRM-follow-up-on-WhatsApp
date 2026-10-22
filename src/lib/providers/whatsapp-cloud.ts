import { ProviderError, type MessageProvider, type SendMessageInput, type SendMessageResult } from "./types";

const API_VERSION = "v21.0";

// Adaptador para a WhatsApp Cloud API (ADR-002). Escrito conforme a documentação pública da Meta
// e NÃO testado contra a API real: isso exige número dedicado e conta verificada.
// Envia texto livre, que só é aceito dentro da janela de 24h de conversa. Fora dela a API pede
// mensagem de modelo aprovado, o que ainda não implementei.
export class WhatsAppCloudProvider implements MessageProvider {
  readonly name = "whatsapp-cloud";

  constructor(
    private readonly phoneNumberId: string,
    private readonly accessToken: string,
  ) {}

  async send(input: SendMessageInput): Promise<SendMessageResult> {
    let response: Response;
    try {
      response = await fetch(`https://graph.facebook.com/${API_VERSION}/${this.phoneNumberId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: input.to.replace(/\D/g, ""),
          type: "text",
          text: { body: input.body },
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      throw new ProviderError(`Falha de rede ao chamar o WhatsApp: ${(error as Error).message}`, true);
    }

    if (!response.ok) {
      // 429 e 5xx são passageiros; os outros 4xx (número inválido, token errado) não adianta repetir.
      const retryable = response.status === 429 || response.status >= 500;
      throw new ProviderError(`WhatsApp respondeu ${response.status}`, retryable);
    }

    const data = (await response.json()) as { messages?: { id: string }[] };
    const id = data.messages?.[0]?.id;
    if (!id) throw new ProviderError("Resposta do WhatsApp sem id de mensagem", true);
    return { providerMessageId: id };
  }
}
