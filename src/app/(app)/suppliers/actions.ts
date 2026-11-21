"use server";

import { revalidatePath } from "next/cache";
import { friendly, type ActionState } from "@/lib/action";
import { paySupplier } from "@/lib/services/payments";
import { createSupplier } from "@/lib/services/parties";
import { requireCtx } from "@/lib/session";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function createSupplierAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx();
  try {
    await createSupplier(ctx, { name: str(f, "name"), phone: str(f, "phone"), email: str(f, "email"), notes: str(f, "notes") });
  } catch (e) {
    return { error: friendly(e) };
  }
  revalidatePath("/suppliers");
  return { error: null, ok: true };
}

export async function paySupplierAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx();
  try {
    await paySupplier(ctx, {
      supplierId: str(f, "supplier_id"),
      amount: str(f, "amount"),
      method: str(f, "method"),
      idempotencyKey: str(f, "key") || undefined,
    });
  } catch (e) {
    return { error: friendly(e) };
  }
  revalidatePath("/suppliers");
  return { error: null, ok: true };
}
