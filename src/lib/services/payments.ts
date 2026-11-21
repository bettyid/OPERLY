import { withTx, query, type Tx } from "@/lib/db";
import { audit } from "./audit";
import { D, Decimal, r2 } from "./money";
import { assertCan, DomainError, type Ctx } from "./permissions";
import { parseMethod, parseMoney, type Method } from "./validate";

export type PaymentInput = { amount: number | string; method: Method | string; reference?: string | null; paidAt?: Date };

export async function insertPayments(
  tx: Tx, ctx: Ctx, target: { saleId?: string; purchaseId?: string }, payments: PaymentInput[], key?: string,
): Promise<Decimal> {
  let total = D(0);
  let first = true;
  for (const p of payments) {
    const amount = parseMoney(p.amount, "Payment amount");
    const method = parseMethod(p.method);
    await tx.query(
      `insert into payments (business_id, sale_id, purchase_id, amount, currency, method, paid_at, reference, idempotency_key, created_by)
       values ($1,$2,$3,$4,$5,$6,coalesce($7, now()),$8,$9,$10)`,
      [
        ctx.businessId, target.saleId ?? null, target.purchaseId ?? null, amount.toString(), ctx.currency, method,
        p.paidAt ?? null, p.reference ?? null, first ? (key ?? null) : null, ctx.userId,
      ],
    );
    first = false;
    total = total.plus(amount);
  }
  return total;
}

type Open = { id: string; owed: Decimal };

async function allocateOldestFirst(
  tx: Tx, ctx: Ctx, kind: "sale" | "purchase", partyColumn: "customer_id" | "supplier_id", partyId: string,
  amount: Decimal, method: Method, reference: string | null | undefined, key: string | undefined,
) {
  const table = kind === "sale" ? "sales" : "purchases";
  const dateCol = kind === "sale" ? "sold_at" : "purchased_at";
  const numCol = kind === "sale" ? "sale_number" : "purchase_number";
  const res = await tx.query(
    `select id, total - amount_paid as owed from ${table}
      where business_id = $1 and ${partyColumn} = $2 and status = 'completed' and total > amount_paid
      order by ${dateCol}, ${numCol} for update`,
    [ctx.businessId, partyId],
  );
  const open: Open[] = res.rows.map((r) => ({ id: r.id, owed: D(r.owed) }));
  const outstanding = open.reduce((a, b) => a.plus(b.owed), D(0));
  if (amount.gt(outstanding)) {
    throw new DomainError(`That is more than the ${outstanding.toFixed(2)} currently owed.`, "overpayment");
  }
  let left = amount;
  let first = true;
  for (const o of open) {
    if (left.lte(0)) break;
    const part = Decimal.min(left, o.owed);
    await tx.query(
      `insert into payments (business_id, ${kind === "sale" ? "sale_id" : "purchase_id"}, amount, currency, method, reference, idempotency_key, created_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [ctx.businessId, o.id, part.toString(), ctx.currency, method, reference ?? null, first ? (key ?? null) : null, ctx.userId],
    );
    await tx.query(`update ${table} set amount_paid = amount_paid + $3 where business_id = $1 and id = $2`, [
      ctx.businessId, o.id, part.toString(),
    ]);
    first = false;
    left = left.minus(part);
  }
  return { applied: r2(amount), documents: open.length };
}

async function settle(
  ctx: Ctx, kind: "sale" | "purchase", partyId: string,
  input: { amount: number | string; method: Method | string; reference?: string | null; idempotencyKey?: string },
) {
  const amount = parseMoney(input.amount, "Payment amount");
  const method = parseMethod(input.method);
  const col = kind === "sale" ? "customer_id" : "supplier_id";
  const table = kind === "sale" ? "customers" : "suppliers";
  try {
    return await withTx(async (tx) => {
      const party = await tx.query(`select name from ${table} where business_id=$1 and id=$2`, [ctx.businessId, partyId]);
      if (!party.rows[0]) throw new DomainError("Not found.", "not_found");
      if (input.idempotencyKey) {
        const dup = await tx.query("select 1 from payments where business_id=$1 and idempotency_key=$2", [ctx.businessId, input.idempotencyKey]);
        if (dup.rowCount) return { applied: amount, documents: 0, duplicate: true };
      }
      const out = await allocateOldestFirst(tx, ctx, kind, col, partyId, amount, method, input.reference, input.idempotencyKey);
      await audit(tx, ctx, kind === "sale" ? "customer_payment" : "supplier_payment", partyId, "create", null, {
        amount: amount.toString(), method,
      });
      return { ...out, duplicate: false };
    });
  } catch (e) {
    if ((e as { code?: string }).code === "23505" && input.idempotencyKey) return { applied: amount, documents: 0, duplicate: true };
    throw e;
  }
}

export async function receiveCustomerPayment(
  ctx: Ctx, input: { customerId: string; amount: number | string; method: Method | string; reference?: string | null; idempotencyKey?: string },
) {
  assertCan(ctx, "payments.receive");
  return settle(ctx, "sale", input.customerId, input);
}

export async function paySupplier(
  ctx: Ctx, input: { supplierId: string; amount: number | string; method: Method | string; reference?: string | null; idempotencyKey?: string },
) {
  assertCan(ctx, "purchases.create");
  return settle(ctx, "purchase", input.supplierId, input);
}

export async function customerBalance(ctx: Ctx, customerId: string) {
  const [r] = await query<{ billed: string; paid: string }>(
    `select coalesce(sum(total),0) as billed, coalesce(sum(amount_paid),0) as paid
       from sales where business_id=$1 and customer_id=$2 and status='completed'`,
    [ctx.businessId, customerId],
  );
  return { billed: D(r.billed), paid: D(r.paid), outstanding: D(r.billed).minus(r.paid) };
}

export async function supplierBalance(ctx: Ctx, supplierId: string) {
  const [r] = await query<{ billed: string; paid: string }>(
    `select coalesce(sum(total),0) as billed, coalesce(sum(amount_paid),0) as paid
       from purchases where business_id=$1 and supplier_id=$2 and status='completed'`,
    [ctx.businessId, supplierId],
  );
  return { billed: D(r.billed), paid: D(r.paid), outstanding: D(r.billed).minus(r.paid) };
}

export type Debtor = {
  customerId: string;
  name: string;
  phone: string | null;
  owed: Decimal;
  openSales: number;
  oldestSaleAt: Date;
  sales: { id: string; saleNumber: number; soldAt: Date; total: Decimal; paid: Decimal; owed: Decimal }[];
};

/** Customers who still owe money, biggest debt first. Voided sales never count. */
export async function listDebtors(ctx: Ctx): Promise<Debtor[]> {
  assertCan(ctx, "payments.receive");
  const rows = await query<{
    id: string; sale_number: string; sold_at: Date; total: string; amount_paid: string;
    customer_id: string; name: string; phone: string | null;
  }>(
    `select s.id, s.sale_number, s.sold_at, s.total, s.amount_paid, c.id as customer_id, c.name, c.phone
       from sales s join customers c on c.business_id = s.business_id and c.id = s.customer_id
      where s.business_id = $1 and s.status = 'completed' and s.total > s.amount_paid
      order by s.sold_at, s.sale_number`,
    [ctx.businessId],
  );
  const map = new Map<string, Debtor>();
  for (const r of rows) {
    const owed = D(r.total).minus(r.amount_paid);
    const d = map.get(r.customer_id) ?? {
      customerId: r.customer_id, name: r.name, phone: r.phone, owed: D(0), openSales: 0, oldestSaleAt: r.sold_at, sales: [],
    };
    d.owed = d.owed.plus(owed);
    d.openSales += 1;
    d.sales.push({ id: r.id, saleNumber: Number(r.sale_number), soldAt: r.sold_at, total: D(r.total), paid: D(r.amount_paid), owed });
    map.set(r.customer_id, d);
  }
  return [...map.values()].sort((a, b) => b.owed.comparedTo(a.owed));
}
