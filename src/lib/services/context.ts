import { query } from "@/lib/db";
import { DomainError, type Ctx, type Role } from "./permissions";

/** Builds the acting context from a real membership. No membership, no context. */
export async function loadCtx(businessId: string, userId: string): Promise<Ctx> {
  const rows = await query<{
    role: Role;
    currency: string;
    timezone: string;
    costing_method: "weighted_average" | "fifo";
    allow_negative_stock: boolean;
  }>(
    `select m.role, b.currency, b.timezone, b.costing_method, b.allow_negative_stock
       from memberships m join businesses b on b.id = m.business_id
      where m.business_id = $1 and m.user_id = $2`,
    [businessId, userId],
  );
  if (rows.length === 0) throw new DomainError("You don't have access to this business.", "forbidden");
  const r = rows[0];
  return {
    businessId,
    userId,
    role: r.role,
    currency: r.currency,
    timezone: r.timezone,
    costingMethod: r.costing_method,
    allowNegativeStock: r.allow_negative_stock,
  };
}
