import { D, Decimal } from "./money";
import { DomainError } from "./permissions";

export const METHODS = ["cash", "bank_transfer", "card", "other"] as const;
export type Method = (typeof METHODS)[number];

export function parseMoney(v: unknown, field: string, opts: { min?: number; allowZero?: boolean } = {}): Decimal {
  let d: Decimal;
  try {
    d = D(v as Decimal.Value);
  } catch {
    throw new DomainError(`${field} must be a number.`);
  }
  if (!d.isFinite()) throw new DomainError(`${field} must be a number.`);
  if (!d.equals(d.toDecimalPlaces(2))) throw new DomainError(`${field} can have at most 2 decimal places.`);
  if (d.isNegative()) throw new DomainError(`${field} cannot be negative.`);
  if (d.gt("999999999999")) throw new DomainError(`${field} is too large.`);
  if (!opts.allowZero && d.isZero()) throw new DomainError(`${field} must be greater than zero.`);
  return d;
}

export function parseQty(v: unknown, field: string): Decimal {
  let d: Decimal;
  try {
    d = D(v as Decimal.Value);
  } catch {
    throw new DomainError(`${field} must be a number.`);
  }
  if (!d.isFinite() || d.lte(0)) throw new DomainError(`${field} must be greater than zero.`);
  if (!d.equals(d.toDecimalPlaces(3))) throw new DomainError(`${field} can have at most 3 decimal places.`);
  if (d.gt("999999999")) throw new DomainError(`${field} is too large.`);
  return d;
}

export function parseMethod(v: unknown): Method {
  if (!(METHODS as readonly string[]).includes(String(v))) {
    throw new DomainError("Choose cash, bank transfer, card or other as the payment method.");
  }
  return v as Method;
}

export function parseDate(v: unknown, field: string): Date {
  const d = v instanceof Date ? v : v ? new Date(String(v)) : new Date();
  if (Number.isNaN(d.getTime())) throw new DomainError(`${field} is not a valid date.`);
  if (d.getTime() > Date.now() + 24 * 3600 * 1000) throw new DomainError(`${field} cannot be in the future.`);
  return d;
}

export function paymentStatus(total: Decimal.Value, paid: Decimal.Value): "paid" | "partial" | "unpaid" {
  const t = D(total);
  const p = D(paid);
  if (p.gte(t)) return "paid";
  return p.gt(0) ? "partial" : "unpaid";
}

export async function nextNumber(tx: import("@/lib/db").Tx, businessId: string, name: string): Promise<number> {
  const res = await tx.query(
    `insert into business_counters (business_id, name, value) values ($1, $2, 1)
     on conflict (business_id, name) do update set value = business_counters.value + 1 returning value`,
    [businessId, name],
  );
  return Number(res.rows[0].value);
}
