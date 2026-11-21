"use server";

import { revalidatePath } from "next/cache";
import { friendly, type ActionState } from "@/lib/action";
import { createExpense, voidExpense } from "@/lib/services/expenses";
import { requireCtx } from "@/lib/session";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function createExpenseAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx();
  try {
    await createExpense(ctx, {
      description: str(f, "description"),
      amount: str(f, "amount"),
      expenseDate: str(f, "date") || undefined,
      method: str(f, "method") || "cash",
      categoryName: str(f, "category") || null,
      idempotencyKey: str(f, "key") || undefined,
    });
  } catch (e) {
    return { error: friendly(e) };
  }
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  return { error: null, ok: true };
}

export async function voidExpenseAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx();
  try {
    await voidExpense(ctx, str(f, "id"), str(f, "reason"));
  } catch (e) {
    return { error: friendly(e) };
  }
  revalidatePath("/expenses");
  return { error: null, ok: true };
}
