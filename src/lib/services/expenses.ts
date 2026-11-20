import { getPool, withTx, type Tx } from "@/lib/db";
import { audit } from "./audit";
import { assertCan, DomainError, type Ctx } from "./permissions";
import { parseMethod, parseMoney } from "./validate";

async function categoryId(tx: Tx, ctx: Ctx, name?: string | null) {
  const n = (name ?? "").trim();
  if (!n) return null;
  const res = await tx.query(
    `insert into expense_categories (business_id, name) values ($1,$2)
     on conflict (business_id, name) do update set name = excluded.name returning id`,
    [ctx.businessId, n.slice(0, 80)],
  );
  return res.rows[0].id as string;
}

export async function createExpense(
  ctx: Ctx,
  input: {
    description: string; amount: number | string; expenseDate?: string; method: string; categoryName?: string | null;
    notes?: string | null; source?: "manual" | "voice" | "ocr" | "summary" | "import"; idempotencyKey?: string;
  },
): Promise<{ expenseId: string; duplicate: boolean }> {
  assertCan(ctx, "expenses.manage");
  const description = (input.description ?? "").trim();
  if (!description) throw new DomainError("Describe the expense.");
  const amount = parseMoney(input.amount, "Amount");
  const method = parseMethod(input.method);
  const date = input.expenseDate ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(date).getTime())) throw new DomainError("Use a valid expense date.");

  try {
    return await withTx(async (tx) => {
      if (input.idempotencyKey) {
        const dup = await tx.query("select id from expenses where business_id=$1 and idempotency_key=$2", [ctx.businessId, input.idempotencyKey]);
        if (dup.rows[0]) return { expenseId: dup.rows[0].id as string, duplicate: true };
      }
      const cat = await categoryId(tx, ctx, input.categoryName);
      const res = await tx.query(
        `insert into expenses (business_id, category_id, description, amount, currency, expense_date, payment_method, notes, source, idempotency_key, created_by)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning id`,
        [ctx.businessId, cat, description, amount.toString(), ctx.currency, date, method, input.notes ?? null, input.source ?? "manual", input.idempotencyKey ?? null, ctx.userId],
      );
      await audit(tx, ctx, "expense", res.rows[0].id, "create", null, { description, amount: amount.toString(), date });
      return { expenseId: res.rows[0].id as string, duplicate: false };
    });
  } catch (e) {
    if ((e as { code?: string }).code === "23505" && input.idempotencyKey) {
      const res = await getPool().query("select id from expenses where business_id=$1 and idempotency_key=$2", [ctx.businessId, input.idempotencyKey]);
      if (res.rows[0]) return { expenseId: res.rows[0].id as string, duplicate: true };
    }
    throw e;
  }
}

export async function voidExpense(ctx: Ctx, expenseId: string, reason: string) {
  assertCan(ctx, "expenses.manage");
  const why = (reason ?? "").trim();
  if (why.length < 3) throw new DomainError("Give a reason for voiding this expense.");
  return withTx(async (tx) => {
    const res = await tx.query("select * from expenses where business_id=$1 and id=$2 for update", [ctx.businessId, expenseId]);
    const e = res.rows[0];
    if (!e) throw new DomainError("Expense not found.", "not_found");
    if (e.voided_at) throw new DomainError("This expense is already voided.", "already_voided");
    await tx.query("update expenses set voided_at=now(), void_reason=$3 where business_id=$1 and id=$2", [ctx.businessId, expenseId, why]);
    await audit(tx, ctx, "expense", expenseId, "void", { amount: e.amount, description: e.description }, { voided: true }, why);
  });
}
