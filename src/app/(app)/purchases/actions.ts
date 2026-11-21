"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { friendly, type ActionState } from "@/lib/action";
import { voidPurchase, createPurchase } from "@/lib/services/purchases";
import { requireCtx } from "@/lib/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

type Line = { productId: string; unitName: string; quantity: string; unitCost: string };

function parseLines(raw: string): Line[] | null {
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data) || data.length === 0 || data.length > 200) return null;
    const out: Line[] = [];
    for (const l of data) {
      if (!l || typeof l.productId !== "string" || !UUID.test(l.productId)) return null;
      out.push({
        productId: l.productId,
        unitName: String(l.unitName ?? ""),
        quantity: String(l.quantity ?? ""),
        unitCost: String(l.unitCost ?? ""),
      });
    }
    return out;
  } catch {
    return null;
  }
}

export async function createPurchaseAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx();
  const lines = parseLines(str(f, "lines"));
  if (!lines) return { error: "Add at least one product line." };
  const supplierId = str(f, "supplier_id");
  if (!UUID.test(supplierId)) return { error: "Choose a supplier." };
  const paid = str(f, "paid");
  try {
    await createPurchase(ctx, {
      supplierId,
      purchasedAt: str(f, "date") || undefined,
      extraCosts: str(f, "extra_costs") || "0",
      items: lines.map((l) => ({ productId: l.productId, unitName: l.unitName || undefined, quantity: l.quantity, unitCost: l.unitCost })),
      payments: paid && Number(paid) > 0 ? [{ amount: paid, method: str(f, "method") || "cash" }] : [],
      notes: str(f, "notes") || null,
      idempotencyKey: str(f, "key") || undefined,
    });
  } catch (e) {
    return { error: friendly(e) };
  }
  revalidatePath("/purchases");
  revalidatePath("/products");
  redirect("/purchases");
}

export async function voidPurchaseAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx();
  const id = str(f, "id");
  if (!UUID.test(id)) return { error: "Purchase not found." };
  try {
    await voidPurchase(ctx, id, str(f, "reason"));
  } catch (e) {
    return { error: friendly(e) };
  }
  revalidatePath("/purchases");
  revalidatePath("/products");
  return { error: null, ok: true };
}
