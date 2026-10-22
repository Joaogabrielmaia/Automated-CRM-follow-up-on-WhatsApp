import { SimulatedProvider } from "./simulated";
import { WhatsAppCloudProvider } from "./whatsapp-cloud";
import type { MessageProvider } from "./types";

export type { MessageProvider } from "./types";
export { ProviderError } from "./types";

export function getProvider(): MessageProvider {
  if (process.env.MESSAGE_PROVIDER === "whatsapp-cloud") {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    if (!phoneNumberId || !accessToken) {
      throw new Error("MESSAGE_PROVIDER=whatsapp-cloud exige WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_ACCESS_TOKEN");
    }
    return new WhatsAppCloudProvider(phoneNumberId, accessToken);
  }
  return new SimulatedProvider();
}
