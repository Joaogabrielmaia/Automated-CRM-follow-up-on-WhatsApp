const OPT_OUT_WORDS = new Set(["SAIR", "PARAR", "STOP"]);

// Tira acento, pontuação e espaços extras e deixa em maiúsculas: "  Sair! " vira "SAIR".
export function normalizeReply(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

// RN-03: só vale se a resposta inteira for a palavra. "Não quero sair de casa" não é opt-out.
export function isOptOut(text: string): boolean {
  return OPT_OUT_WORDS.has(normalizeReply(text));
}
