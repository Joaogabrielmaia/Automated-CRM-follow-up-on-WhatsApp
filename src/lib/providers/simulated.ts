import { createHash } from "node:crypto";
import { ProviderError, type MessageProvider, type SendMessageInput, type SendMessageResult } from "./types";

// Não faz chamada de rede. Serve para a demonstração e para os testes (ADR-002).
// O final do telefone escolhe o comportamento, para dar para mostrar falha e retentativa:
//   ...0000  falha temporária sempre
//   ...0001  falha temporária só na primeira tentativa
//   ...9999  falha definitiva (número inválido)
export class SimulatedProvider implements MessageProvider {
  readonly name = "simulated";

  async send(input: SendMessageInput): Promise<SendMessageResult> {
    if (input.to.endsWith("0000")) throw new ProviderError("Falha simulada: provedor indisponível", true);
    if (input.to.endsWith("0001") && input.attempt === 1) {
      throw new ProviderError("Falha simulada: instabilidade na primeira tentativa", true);
    }
    if (input.to.endsWith("9999")) throw new ProviderError("Falha simulada: número inválido", false);

    const id = createHash("sha256").update(input.idempotencyKey).digest("hex").slice(0, 16);
    return { providerMessageId: `sim_${id}` };
  }
}
