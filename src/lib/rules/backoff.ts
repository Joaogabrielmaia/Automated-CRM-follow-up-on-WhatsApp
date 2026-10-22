// RN-11: tentativa inicial + 3 retentativas, esperando 1, 5 e 15 minutos entre elas.
export const MAX_ATTEMPTS = 4;
const BACKOFF_MINUTES = [1, 5, 15];

// attempt = quantas tentativas já foram feitas (1 depois da primeira falha).
export function backoffMinutes(attempt: number): number {
  return BACKOFF_MINUTES[Math.min(Math.max(attempt, 1), BACKOFF_MINUTES.length) - 1];
}

export function canRetry(attempt: number, retryable: boolean): boolean {
  return retryable && attempt < MAX_ATTEMPTS;
}
