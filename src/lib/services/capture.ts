import { getPool, query } from "@/lib/db";
import { anthropicCall, buildUserMessage, CAPTURE_MODEL, parseExtraction, SYSTEM_PROMPT, TOOL, type ModelCall } from "@/lib/ai/extract";
import { buildDraft, type CatalogProduct } from "@/lib/capture/draft";
import { audit } from "./audit";
import { createExpense } from "./expenses";
import { assertCan, DomainError, type Ctx } from "./permissions";
import { createPurchase } from "./purchases";
import { createSale } from "./sales";
import { createSummary } from "./summaries";
import { withTx } from "@/lib/db";

export const DAILY_CAPTURE_LIMIT = 30;
export const PER_MINUTE_LIMIT = 6;
const MAX_TRANSCRIPT = 1000;

function todayIn(tz: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
}

export async function loadCatalog(ctx: Ctx) {
  const products = await query<{ id: string; name: string; base_unit: string }>(
    "select id, name, base_unit from products where business_id=$1 and archived_at is null order by lower(name) limit 200", [ctx.businessId]);
  const units = products.length
    ? await query<{ product_id: string; name: string; factor: string; sell_price: string | null }>(
        "select product_id, name, factor, sell_price from product_units where business_id=$1 and product_id = any($2::uuid[]) order by is_base desc, factor",
        [ctx.businessId, products.map((p) => p.id)])
    : [];
  const customers = await query<{ id: string; name: string }>(
    "select id, name from customers where business_id=$1 and archived_at is null order by lower(name) limit 200", [ctx.businessId]);
  const suppliers = await query<{ id: string; name: string }>(
    "select id, name from suppliers where business_id=$1 and archived_at is null order by lower(name) limit 100", [ctx.businessId]);
  const catalog: CatalogProduct[] = products.map((p) => ({
    id: p.id, name: p.name, baseUnit: p.base_unit,
    units: units.filter((u) => u.product_id === p.id).map((u) => ({ name: u.name, factor: Number(u.factor), price: u.sell_price })),
  }));
  return { products: catalog, customers, suppliers };
}

/** Understand a spoken or typed note. Creates a DRAFT only. Nothing is recorded until it is confirmed. */
export async function createCapture(ctx: Ctx, transcript: string, deps: { call?: ModelCall } = {}) {
  assertCan(ctx, "sales.create");
  const text = (transcript ?? "").trim();
  if (text.length < 3) throw new DomainError("Say or type what happened first.");
  if (text.length > MAX_TRANSCRIPT) throw new DomainError(`Keep it under ${MAX_TRANSCRIPT} characters. You can record the rest separately.`);

  const [counts] = await query<{ day: string; minute: string }>(
    `select count(*) filter (where created_at > now() - interval '24 hours') as day,
            count(*) filter (where user_id = $2 and created_at > now() - interval '1 minute') as minute
       from ai_usage where business_id = $1 and feature = 'voice_capture'`,
    [ctx.businessId, ctx.userId],
  );
  if (Number(counts.day) >= DAILY_CAPTURE_LIMIT) throw new DomainError(`You've used today's ${DAILY_CAPTURE_LIMIT} voice and typed captures. Use the forms, or try again tomorrow.`, "rate_limited");
  if (Number(counts.minute) >= PER_MINUTE_LIMIT) throw new DomainError("That's a lot at once. Wait a minute and try again.", "rate_limited");

  const catalog = await loadCatalog(ctx);
  const today = todayIn(ctx.timezone);
  const call = deps.call ?? anthropicCall;
  const res = await call({
    system: SYSTEM_PROMPT,
    user: buildUserMessage(text, {
      today, currency: ctx.currency,
      products: catalog.products.map((p) => p.name), customers: catalog.customers.map((c) => c.name), suppliers: catalog.suppliers.map((s) => s.name),
    }),
    tool: TOOL,
    maxTokens: 700,
  });

  // The provider handled the request, so its reported usage is recorded whatever the outcome.
  await query(
    `insert into ai_usage (business_id, user_id, feature, model, input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens, request_id)
     values ($1,$2,'voice_capture',$3,$4,$5,$6,$7,$8)`,
    [ctx.businessId, ctx.userId, res.model || CAPTURE_MODEL, res.usage.input_tokens ?? 0, res.usage.output_tokens ?? 0,
      res.usage.cache_read_input_tokens ?? 0, res.usage.cache_creation_input_tokens ?? 0, res.requestId ?? null],
  );

  const extraction = parseExtraction(res.input);
  const draft = buildDraft(extraction, { today, currency: ctx.currency, products: catalog.products, customers: catalog.customers, suppliers: catalog.suppliers });
  const [row] = await query<{ id: string }>(
    "insert into voice_captures (business_id, user_id, transcript, extraction, draft, model) values ($1,$2,$3,$4,$5,$6) returning id",
    [ctx.businessId, ctx.userId, text, JSON.stringify(extraction), JSON.stringify(draft), res.model || CAPTURE_MODEL],
  );
  return { captureId: row.id, draft };
}

export type ConfirmPayload =
  | {
      type: "sale";
      date: string;
      customerId: string | null;
      lines: { productId: string; unitName: string; quantity: string; price: string }[];
      payMode: "full" | "partial" | "later";
      paid: string;
      method: string;
      discount: string;
    }
  | {
      type: "purchase";
      date: string;
      supplierId: string;
      lines: { productId: string; unitName: string; quantity: string; price: string }[];
      extraCosts: string;
      paid: string;
      method: string;
    }
  | { type: "expense"; date: string; description: string; amount: string; category: string; method: string }
  | {
      type: "summary";
      period: "day" | "week";
      start: string;
      end: string;
      unitsSold: string;
      cash: string;
      transfer: string;
      card: string;
      other: string;
      expenses: { description: string; amount: string }[];
    };

function atNoonIfBackdated(date: string, tz: string): string | undefined {
  return date === todayIn(tz) ? undefined : `${date}T12:00:00Z`;
}

/** Commit what the owner reviewed. The values come from the reviewed form, never straight from the model. */
export async function confirmCapture(ctx: Ctx, captureId: string, p: ConfirmPayload) {
  const [cap] = await query<{ status: string; result_type: string | null; result_id: string | null }>(
    "select status, result_type, result_id from voice_captures where business_id=$1 and id=$2 and user_id=$3",
    [ctx.businessId, captureId, ctx.userId],
  );
  if (!cap) throw new DomainError("That capture wasn't found.", "not_found");
  if (cap.status === "confirmed") return { type: cap.result_type!, id: cap.result_id!, duplicate: true };
  if (cap.status !== "draft") throw new DomainError("That capture was already discarded.", "not_found");

  const key = `voice:${captureId}`;
  let type: string;
  let id: string;
  if (p.type === "sale") {
    const r = await createSale(ctx, {
      customerId: p.customerId || null,
      soldAt: atNoonIfBackdated(p.date, ctx.timezone),
      items: p.lines.map((l) => ({ productId: l.productId, unitName: l.unitName, quantity: l.quantity, unitPrice: l.price })),
      discount: p.discount || "0",
      payInFull: p.payMode === "full" ? p.method : undefined,
      payments: p.payMode === "partial" ? [{ amount: p.paid, method: p.method }] : p.payMode === "later" ? [] : undefined,
      source: "voice",
      idempotencyKey: key,
    });
    type = "sale"; id = r.saleId;
  } else if (p.type === "purchase") {
    const r = await createPurchase(ctx, {
      supplierId: p.supplierId,
      purchasedAt: atNoonIfBackdated(p.date, ctx.timezone),
      items: p.lines.map((l) => ({ productId: l.productId, unitName: l.unitName, quantity: l.quantity, unitCost: l.price })),
      extraCosts: p.extraCosts || "0",
      payments: p.paid && Number(p.paid) > 0 ? [{ amount: p.paid, method: p.method }] : [],
      source: "voice",
      idempotencyKey: key,
    });
    type = "purchase"; id = r.purchaseId;
  } else if (p.type === "expense") {
    const r = await createExpense(ctx, {
      description: p.description, amount: p.amount, expenseDate: p.date, method: p.method, categoryName: p.category || null,
      source: "voice", idempotencyKey: key,
    });
    type = "expense"; id = r.expenseId;
  } else {
    const r = await createSummary(ctx, {
      period: p.period, periodStart: p.start, periodEnd: p.period === "week" ? p.end : undefined,
      unitsSold: p.unitsSold || null,
      received: { cash: p.cash || 0, transfer: p.transfer || 0, card: p.card || 0, other: p.other || 0 },
      expenses: p.expenses.filter((e) => e.description.trim() || e.amount.trim()),
      source: "voice", idempotencyKey: key,
    });
    type = "summary"; id = r.summaryId;
  }

  await withTx(async (tx) => {
    await tx.query(
      "update voice_captures set status='confirmed', result_type=$3, result_id=$4, confirmed_at=now() where business_id=$1 and id=$2",
      [ctx.businessId, captureId, type, id],
    );
    await audit(tx, ctx, "voice_capture", captureId, "create", null, { type, id });
  });
  return { type, id, duplicate: false };
}

export async function discardCapture(ctx: Ctx, captureId: string) {
  await getPool().query(
    "update voice_captures set status='discarded' where business_id=$1 and id=$2 and user_id=$3 and status='draft'",
    [ctx.businessId, captureId, ctx.userId],
  );
}
