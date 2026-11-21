import type { Extraction } from "@/lib/ai/extract";
import { D, r2 } from "@/lib/services/money";
import { matchUnit, pick, type Candidate } from "./match";

export type CatalogProduct = { id: string; name: string; baseUnit: string; units: { name: string; factor: number; price: string | null }[] };

export type DraftLine = {
  productText: string;
  productId: string | null;
  productOptions: Candidate[];
  unitName: string;
  quantity: string;
  price: string;
  priceSource: "spoken" | "computed" | "catalog" | "missing";
};

export type Draft = {
  type: "sale" | "purchase" | "expense" | "summary" | "unknown";
  date: string;
  confidence: "high" | "medium" | "low";
  notes: string | null;
  issues: string[];
  partyText: string | null;
  partyId: string | null;
  partyOptions: Candidate[];
  lines: DraftLine[];
  payMode: "full" | "partial" | "later";
  paid: string;
  method: string;
  discount: string;
  extraCosts: string;
  expense: { description: string; amount: string; category: string } | null;
  summary: { period: "day" | "week"; unitsSold: string; cash: string; transfer: string; card: string; other: string; expenses: { description: string; amount: string }[] } | null;
};

export type DraftContext = {
  today: string; // YYYY-MM-DD in the business time zone
  currency: string;
  products: CatalogProduct[];
  customers: Candidate[];
  suppliers: Candidate[];
};

const CURRENCY_OK = /^[A-Z]{3}$/;
const s = (n: number | null) => (n === null ? "" : String(n));

function resolveDate(raw: string | null, today: string, issues: string[]): string {
  if (!raw || raw.toLowerCase() === "today") return today;
  if (raw.toLowerCase() === "yesterday") return new Date(new Date(today + "T12:00:00Z").getTime() - 86_400_000).toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw) && new Date(raw + "T00:00:00Z").toISOString().slice(0, 10) === raw) {
    if (raw > today) {
      issues.push("The date you said is in the future, so today's date was used. Check it.");
      return today;
    }
    return raw;
  }
  issues.push("I couldn't read the date, so today's date was used. Check it.");
  return today;
}

/** Turns what the model heard into an editable draft. Matching and arithmetic are done here, in code. */
export function buildDraft(x: Extraction, ctx: DraftContext): Draft {
  const issues: string[] = [];
  const date = resolveDate(x.date, ctx.today, issues);
  if (x.currency && CURRENCY_OK.test(x.currency) && x.currency !== ctx.currency) {
    issues.push(`You mentioned ${x.currency}, but this business records money in ${ctx.currency}. Amounts are saved in ${ctx.currency}.`);
  }
  if (x.confidence === "low") issues.push("I wasn't sure I understood everything. Please check every field.");

  const draft: Draft = {
    type: x.activity, date, confidence: x.confidence, notes: x.notes, issues, partyText: x.partyText, partyId: null, partyOptions: [],
    lines: [], payMode: "full", paid: "", method: x.paymentMethod ?? "cash", discount: s(x.discount), extraCosts: s(x.extraCosts),
    expense: null, summary: null,
  };

  if (x.activity === "sale" || x.activity === "purchase") {
    const isSale = x.activity === "sale";
    if (x.items.length === 0) issues.push("I didn't hear which products were involved. Add them below.");
    draft.lines = x.items.map((i) => {
      const text = i.productText ?? "";
      const p = pick(text, ctx.products);
      const product = p.match ? ctx.products.find((c) => c.id === p.match!.id)! : null;
      if (!product) {
        issues.push(text ? (p.ambiguous ? `"${text}" could be more than one product. Choose the right one.` : `I couldn't match "${text}" to your products. Choose one, or add the product first.`) : "A line has no product. Choose one.");
      }
      let unitName = product?.baseUnit ?? "";
      if (product) {
        const matched = matchUnit(i.unit, product.units);
        if (matched) unitName = matched;
        else if (i.unit) issues.push(`"${i.unit}" isn't a unit set up for ${product.name}. ${product.baseUnit} was used. Check it.`);
        else issues.push(`No unit was mentioned for ${product.name}, so ${product.baseUnit} was assumed. Check it.`);
      }
      const qty = i.quantity;
      if (qty === null || qty <= 0) issues.push(`No quantity was heard for ${product?.name ?? (text || "a product")}. Enter it.`);

      let price = "";
      let priceSource: DraftLine["priceSource"] = "missing";
      if (i.unitPrice !== null) {
        price = String(i.unitPrice);
        priceSource = "spoken";
      } else if (i.lineTotal !== null && qty && qty > 0) {
        const each = D(i.lineTotal).div(qty);
        price = r2(each).toString();
        priceSource = "computed";
        if (!each.equals(r2(each))) issues.push(`${product?.name ?? text}: ${i.lineTotal} for ${qty} doesn't divide into an exact price, so it was rounded. Check it.`);
      } else if (isSale && product) {
        const listed = product.units.find((u) => u.name === unitName)?.price;
        if (listed) {
          price = listed;
          priceSource = "catalog";
          issues.push(`No price was heard for ${product.name}, so your listed price was used.`);
        }
      }
      if (!price) issues.push(`No price was heard for ${product?.name ?? (text || "a product")}. Enter it.`);

      return { productText: text, productId: product?.id ?? null, productOptions: p.options, unitName, quantity: s(qty), price, priceSource };
    });

    const party = pick(x.partyText, isSale ? ctx.customers : ctx.suppliers);
    draft.partyOptions = party.options;
    if (party.match) draft.partyId = party.match.id;
    else if (x.partyText) {
      issues.push(isSale
        ? `I couldn't match "${x.partyText}" to a customer. Choose one, or leave it as a walk-in sale.`
        : `I couldn't match "${x.partyText}" to a supplier. Choose one, or add the supplier first.`);
    }
    if (!isSale && !party.match) issues.push("Every purchase needs a supplier. Choose one.");

    if (!x.paymentMethod && (x.amountPaid === null || x.amountPaid > 0)) issues.push("No payment method was heard, so cash was assumed. Check it.");
    const total = draft.lines.reduce((a, l) => a.plus(D(l.quantity || 0).times(D(l.price || 0))), D(0)).minus(D(x.discount ?? 0));
    if (isSale) {
      if (x.amountPaid === null) {
        draft.payMode = "full";
        issues.push("Payment was assumed to be in full. If the customer still owes you, change it to part payment or pay later.");
      } else if (x.amountPaid === 0) {
        draft.payMode = "later";
      } else if (total.gt(0) && D(x.amountPaid).lt(total)) {
        draft.payMode = "partial";
        draft.paid = String(x.amountPaid);
      } else {
        draft.payMode = "full";
      }
    } else if (x.amountPaid !== null) {
      draft.paid = String(x.amountPaid);
    } else {
      issues.push("I didn't hear how much was paid to the supplier. Enter it, or leave it empty if nothing was paid yet.");
    }
  } else if (x.activity === "expense") {
    const e = x.expense;
    draft.expense = { description: e?.description ?? "", amount: s(e?.amount ?? null), category: e?.category ?? "" };
    if (!e?.description) issues.push("What was the expense for? Enter a description.");
    if (!e?.amount) issues.push("I didn't hear the amount. Enter it.");
  } else if (x.activity === "summary") {
    const m = x.summary;
    draft.summary = {
      period: m?.period ?? "day", unitsSold: s(m?.unitsSold ?? null), cash: s(m?.cash ?? null), transfer: s(m?.transfer ?? null),
      card: s(m?.card ?? null), other: s(m?.other ?? null), expenses: (m?.expenses ?? []).map((e) => ({ description: e.description, amount: String(e.amount) })),
    };
    issues.push("This will be saved as a summary, not as individual sales. Stock and customers are not changed.");
  } else {
    issues.push("I couldn't tell what to record from that. Try again with more detail, or use the forms.");
  }
  return draft;
}
