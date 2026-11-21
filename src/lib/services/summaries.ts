import { getPool, withTx } from "@/lib/db";
import { audit } from "./audit";
import { D, r2 } from "./money";
import { assertCan, DomainError, type Ctx } from "./permissions";
import { parseMethod, parseMoney } from "./validate";

export type SummaryInput = {
  period?: "day" | "week";
  periodStart: string; // YYYY-MM-DD
  periodEnd?: string;
  unitsSold?: number | string | null;
  salesTotal?: number | string | null;
  received?: { cash?: number | string; transfer?: number | string; card?: number | string; other?: number | string };
  expenses?: { description: string; amount: number | string; method?: string; categoryName?: string | null }[];
  note?: string | null;
  source?: "manual" | "voice" | "ocr";
  idempotencyKey?: string;
};

export type SummaryResult = {
  summaryId: string;
  duplicate: boolean;
  /** Individual sales already recorded for the same period, so the owner can avoid counting them twice. */
  overlap: { sales: number; total: string };
};

function validDay(s: string | undefined, label: string): string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new DomainError(`${label} must be a valid date.`);
  const d = new Date(s + "T00:00:00Z");
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) throw new DomainError(`${label} must be a valid date.`);
  return s;
}

function todayIn(tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
}

async function overlapFor(ctx: Ctx, start: string, end: string) {
  const res = await getPool().query(
    `select count(*) as n, coalesce(sum(total),0) as total from sales
      where business_id = $1 and status = 'completed'
        and (sold_at at time zone $4)::date between $2::date and $3::date`,
    [ctx.businessId, start, end, ctx.timezone],
  );
  return { sales: Number(res.rows[0].n), total: D(res.rows[0].total).toFixed(2) };
}

export async function createSummary(ctx: Ctx, input: SummaryInput): Promise<SummaryResult> {
  assertCan(ctx, "expenses.manage");
  const period = input.period ?? "day";
  const start = validDay(input.periodStart, "The date");
  const end = period === "week" ? validDay(input.periodEnd, "The end date") : start;
  const today = todayIn(ctx.timezone);
  if (end > today || start > today) throw new DomainError("A summary can't be for a future date.");
  if (end < start) throw new DomainError("The end date can't be before the start date.");
  if (period === "week" && (new Date(end).getTime() - new Date(start).getTime()) / 86_400_000 > 6) {
    throw new DomainError("A weekly summary can cover at most 7 days.");
  }

  const unitsSold = input.unitsSold === null || input.unitsSold === undefined || input.unitsSold === "" ? null : D(input.unitsSold);
  if (unitsSold && (!unitsSold.isFinite() || unitsSold.isNegative() || !unitsSold.equals(unitsSold.toDecimalPlaces(3)))) {
    throw new DomainError("Units sold must be a positive number.");
  }
  const salesTotal = input.salesTotal === null || input.salesTotal === undefined || input.salesTotal === ""
    ? null : parseMoney(input.salesTotal, "Sales total", { allowZero: true });

  const rec = input.received ?? {};
  const cash = parseMoney(rec.cash ?? 0, "Cash received", { allowZero: true });
  const transfer = parseMoney(rec.transfer ?? 0, "Transfer received", { allowZero: true });
  const card = parseMoney(rec.card ?? 0, "Card received", { allowZero: true });
  const other = parseMoney(rec.other ?? 0, "Other payments received", { allowZero: true });

  const expenses = (input.expenses ?? []).map((e) => {
    const description = (e.description ?? "").trim();
    if (!description) throw new DomainError("Describe each expense.");
    return { description: description.slice(0, 200), amount: parseMoney(e.amount, "Expense amount"), method: parseMethod(e.method ?? "cash"), category: (e.categoryName ?? "").trim() || null };
  });
  if (expenses.length > 50) throw new DomainError("A summary can list at most 50 expenses.");

  const receivedTotal = cash.plus(transfer).plus(card).plus(other);
  if (receivedTotal.isZero() && !salesTotal?.gt(0) && !unitsSold?.gt(0) && expenses.length === 0) {
    throw new DomainError("Enter at least one amount: money received, units sold, or an expense.");
  }

  const overlap = await overlapFor(ctx, start, end);

  try {
    const summaryId = await withTx(async (tx) => {
      if (input.idempotencyKey) {
        const dup = await tx.query("select id from daily_summaries where business_id=$1 and idempotency_key=$2", [ctx.businessId, input.idempotencyKey]);
        if (dup.rows[0]) return `dup:${dup.rows[0].id}`;
      }
      const ins = await tx.query(
        `insert into daily_summaries (business_id, period, period_start, period_end, currency, units_sold, sales_total,
           received_cash, received_transfer, received_card, received_other, note, source, idempotency_key, created_by)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) returning id`,
        [
          ctx.businessId, period, start, end, ctx.currency, unitsSold?.toString() ?? null, salesTotal?.toString() ?? null,
          cash.toString(), transfer.toString(), card.toString(), other.toString(), (input.note ?? "").trim() || null,
          input.source ?? "manual", input.idempotencyKey ?? null, ctx.userId,
        ],
      );
      const id: string = ins.rows[0].id;
      for (const e of expenses) {
        let cat: string | null = null;
        if (e.category) {
          const c = await tx.query(
            `insert into expense_categories (business_id, name) values ($1,$2)
             on conflict (business_id, name) do update set name = excluded.name returning id`,
            [ctx.businessId, e.category.slice(0, 80)],
          );
          cat = c.rows[0].id;
        }
        await tx.query(
          `insert into expenses (business_id, category_id, description, amount, currency, expense_date, payment_method, source, summary_id, created_by)
           values ($1,$2,$3,$4,$5,$6,$7,'summary',$8,$9)`,
          [ctx.businessId, cat, e.description, e.amount.toString(), ctx.currency, end, e.method, id, ctx.userId],
        );
      }
      await audit(tx, ctx, "summary", id, "create", null, {
        period, start, end, received: receivedTotal.toString(), expenses: expenses.length, units: unitsSold?.toString() ?? null,
      });
      return id;
    });
    if (summaryId.startsWith("dup:")) return { summaryId: summaryId.slice(4), duplicate: true, overlap };
    return { summaryId, duplicate: false, overlap };
  } catch (e) {
    const err = e as { code?: string; constraint?: string };
    if (err.code === "23505" && err.constraint === "daily_summaries_period_uq") {
      throw new DomainError(
        period === "day" ? "You already recorded a summary for that day. Void it first if you need to enter it again."
          : "You already recorded a weekly summary starting that day. Void it first if you need to enter it again.",
        "duplicate_summary",
      );
    }
    if (err.code === "23505" && err.constraint === "daily_summaries_idem_uq" && input.idempotencyKey) {
      const res = await getPool().query("select id from daily_summaries where business_id=$1 and idempotency_key=$2", [ctx.businessId, input.idempotencyKey]);
      if (res.rows[0]) return { summaryId: res.rows[0].id as string, duplicate: true, overlap };
    }
    throw e;
  }
}

export async function voidSummary(ctx: Ctx, summaryId: string, reason: string) {
  assertCan(ctx, "expenses.manage");
  const why = (reason ?? "").trim();
  if (why.length < 3) throw new DomainError("Give a reason for voiding this summary.");
  return withTx(async (tx) => {
    const res = await tx.query("select * from daily_summaries where business_id=$1 and id=$2 for update", [ctx.businessId, summaryId]);
    const s = res.rows[0];
    if (!s) throw new DomainError("Summary not found.", "not_found");
    if (s.status === "voided") throw new DomainError("This summary is already voided.", "already_voided");
    await tx.query("update expenses set voided_at = now(), void_reason = $3 where business_id=$1 and summary_id=$2 and voided_at is null", [
      ctx.businessId, summaryId, `Summary voided: ${why}`,
    ]);
    await tx.query("update daily_summaries set status='voided', voided_at=now(), void_reason=$3 where business_id=$1 and id=$2", [ctx.businessId, summaryId, why]);
    await audit(tx, ctx, "summary", summaryId, "void", { status: "active" }, { status: "voided" }, why);
  });
}

export function summaryReceivedTotal(s: { received_cash: string; received_transfer: string; received_card: string; received_other: string }) {
  return r2(D(s.received_cash).plus(s.received_transfer).plus(s.received_card).plus(s.received_other));
}
