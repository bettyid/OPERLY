"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { friendly, type ActionState } from "@/lib/action";
import { createSale } from "@/lib/services/sales";
import { requireCtx } from "@/lib/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function createPosSaleAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx();

  let cart: { productId: string; unitName: string; quantity: string }[];
  try {
    const raw = JSON.parse(str(f, "cart"));
    if (!Array.isArray(raw) || raw.length === 0 || raw.length > 200) throw new Error("bad cart");
    cart = raw.map((l) => {
      if (!l || typeof l.productId !== "string" || !UUID.test(l.productId)) throw new Error("bad line");
      return { productId: l.productId, unitName: String(l.unitName ?? ""), quantity: String(l.quantity ?? "") };
    });
  } catch {
    return { error: "Add at least one product to the sale." };
  }

  const mode = str(f, "pay_mode");
  const customerId = str(f, "customer_id");
  if (customerId && !UUID.test(customerId)) return { error: "Choose a valid customer." };
  if (mode !== "full" && !customerId) {
    return { error: "Choose a customer for a sale that isn't paid in full, so you know who owes you." };
  }
  const method = str(f, "method") || "cash";
  const paid = str(f, "paid");

  let saleId: string;
  try {
    const res = await createSale(ctx, {
      customerId: customerId || null,
      items: cart.map((l) => ({ productId: l.productId, unitName: l.unitName || undefined, quantity: l.quantity })),
      discount: str(f, "discount") || "0",
      payInFull: mode === "full" ? method : undefined,
      payments: mode === "partial" ? [{ amount: paid, method }] : mode === "later" ? [] : undefined,
      source: "pos",
      idempotencyKey: str(f, "key") || undefined,
    });
    saleId = res.saleId;
  } catch (e) {
    return { error: friendly(e) };
  }
  revalidatePath("/sales");
  revalidatePath("/products");
  revalidatePath("/dashboard");
  redirect(`/sales/${saleId}`);
}
