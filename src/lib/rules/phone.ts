// RN-13: guardo só dígitos no formato +55DDDNÚMERO. Devolve null se não parecer um telefone brasileiro.
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) digits = digits.slice(2);
  if (digits.length !== 10 && digits.length !== 11) return null;

  const ddd = Number(digits.slice(0, 2));
  if (ddd < 11 || ddd > 99) return null;

  const number = digits.slice(2);
  if (number.length === 9 && number[0] !== "9") return null;
  return "+55" + digits;
}

export function formatPhone(normalized: string): string {
  const d = normalized.replace(/\D/g, "").slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return normalized;
}
