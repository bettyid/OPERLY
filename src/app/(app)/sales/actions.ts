"use server";

import { revalidatePath } from "next/cache";
import { friendly, type ActionState } from "@/lib/action";
import { voidSale } from "@/lib/services/sales";
import { requireCtx } from "@/lib/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function voidSaleAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx();
  const id = String(f.get("id") ?? "");
  if (!UUID.test(id)) return { error: "Sale not found." };
  try {
    await voidSale(ctx, id, String(f.get("reason") ?? ""));
  } catch (e) {
    return { error: friendly(e) };
  }
  revalidatePath("/sales");
  revalidatePath(`/sales/${id}`);
  revalidatePath("/products");
  revalidatePath("/dashboard");
  return { error: null, ok: true };
}
