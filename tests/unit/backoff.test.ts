import { describe, expect, it } from "vitest";
import { MAX_ATTEMPTS, backoffMinutes, canRetry } from "@/lib/rules/backoff";

describe("retentativa com backoff (RN-11)", () => {
  it("espera 1, 5 e 15 minutos", () => {
    expect([1, 2, 3].map(backoffMinutes)).toEqual([1, 5, 15]);
  });

  it("nunca passa de 15 minutos", () => {
    expect(backoffMinutes(9)).toBe(15);
  });

  it("tenta de novo até a 4ª tentativa", () => {
    expect(MAX_ATTEMPTS).toBe(4);
    expect(canRetry(1, true)).toBe(true);
    expect(canRetry(3, true)).toBe(true);
    expect(canRetry(4, true)).toBe(false);
  });

  it("não tenta de novo um erro definitivo", () => {
    expect(canRetry(1, false)).toBe(false);
  });
});
