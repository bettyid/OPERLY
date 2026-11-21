import { DomainError } from "./services/permissions";

export type ActionState = { error: string | null; ok?: boolean };

/** Turn any thrown error into a message that is safe to show. Unexpected errors are logged, not leaked. */
export function friendly(e: unknown): string {
  if (e instanceof DomainError) return e.message;
  console.error(e);
  return "Something went wrong. Please try again.";
}

export function fmtQty(n: number | string): string {
  const v = Number(n);
  return Number.isInteger(v) ? v.toLocaleString("en") : v.toLocaleString("en", { maximumFractionDigits: 3 });
}
