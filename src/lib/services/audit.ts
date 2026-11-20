import type { Tx } from "@/lib/db";
import type { Ctx } from "./permissions";

export async function audit(
  tx: Tx,
  ctx: Ctx,
  entity: string,
  entityId: string,
  action: "create" | "update" | "void" | "correct" | "archive",
  before: unknown,
  after: unknown,
  reason?: string | null,
) {
  await tx.query(
    `insert into audit_log (business_id, user_id, entity, entity_id, action, before, after, reason)
     values ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      ctx.businessId,
      ctx.userId,
      entity,
      entityId,
      action,
      before === null || before === undefined ? null : JSON.stringify(before),
      after === null || after === undefined ? null : JSON.stringify(after),
      reason ?? null,
    ],
  );
}
