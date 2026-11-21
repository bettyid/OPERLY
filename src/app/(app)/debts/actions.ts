"use server";

import { revalidatePath } from "next/cache";
import { friendly, type ActionState } from "@/lib/action";
import { receiveCustomerPayment } from "@/lib/services/payments";
import { requireCtx } from "@/lib/session";

export async function receivePaymentAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx();
  try {
    await receiveCustomerPayment(ctx, {
      customerId: String(f.get("customer_id") ?? ""),
      amount: String(f.get("amount") ?? "").trim(),
      method: String(f.get("method") ?? "cash"),
      idempotencyKey: String(f.get("key") ?? "") || undefined,
    });
  } catch (e) {
    return { error: friendly(e) };
  }
  revalidatePath("/debts");
  revalidatePath("/customers");
  revalidatePath("/sales");
  revalidatePath("/dashboard");
  return { error: null, ok: true };
}
