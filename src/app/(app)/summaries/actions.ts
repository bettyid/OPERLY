"use server";

import { revalidatePath } from "next/cache";
import { friendly, type ActionState } from "@/lib/action";
import { createSummary, voidSummary } from "@/lib/services/summaries";
import { requireCtx } from "@/lib/session";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export type SummaryState = ActionState & { notice?: string };

export async function createSummaryAction(_prev: SummaryState, f: FormData): Promise<SummaryState> {
  const { ctx } = await requireCtx();
  let expenses: { description: string; amount: string; categoryName?: string }[] = [];
  try {
    const raw = JSON.parse(str(f, "expenses") || "[]");
    if (!Array.isArray(raw)) throw new Error("bad");
    expenses = raw
      .filter((e) => e && (String(e.description ?? "").trim() || String(e.amount ?? "").trim()))
      .map((e) => ({ description: String(e.description ?? ""), amount: String(e.amount ?? ""), categoryName: String(e.category ?? "") }));
  } catch {
    return { error: "The expenses couldn't be read. Please try again." };
  }
  const period = str(f, "period") === "week" ? "week" : "day";
  try {
    const res = await createSummary(ctx, {
      period,
      periodStart: str(f, "start"),
      periodEnd: period === "week" ? str(f, "end") : undefined,
      unitsSold: str(f, "units") || null,
      salesTotal: str(f, "sales_total") || null,
      received: { cash: str(f, "cash") || 0, transfer: str(f, "transfer") || 0, card: str(f, "card") || 0, other: str(f, "other") || 0 },
      expenses,
      note: str(f, "note") || null,
      idempotencyKey: str(f, "key") || undefined,
    });
    revalidatePath("/summaries");
    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    const o = res.overlap;
    return {
      error: null,
      ok: true,
      notice: o.sales > 0
        ? `Saved. Heads up: ${o.sales} ${o.sales === 1 ? "sale was" : "sales were"} also recorded individually for this period (${o.total} in total). Avoid counting the same sales twice.`
        : "Saved.",
    };
  } catch (e) {
    return { error: friendly(e) };
  }
}

export async function voidSummaryAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx();
  try {
    await voidSummary(ctx, str(f, "id"), str(f, "reason"));
  } catch (e) {
    return { error: friendly(e) };
  }
  revalidatePath("/summaries");
  revalidatePath("/expenses");
  return { error: null, ok: true };
}
