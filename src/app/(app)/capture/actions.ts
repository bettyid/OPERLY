"use server";

import { revalidatePath } from "next/cache";
import { friendly } from "@/lib/action";
import type { Draft } from "@/lib/capture/draft";
import { parsePayload } from "@/lib/capture/payload";
import { confirmCapture, createCapture, discardCapture, type ConfirmPayload } from "@/lib/services/capture";
import { requireCtx } from "@/lib/session";

export type ExtractState = { error: string | null; captureId?: string; draft?: Draft };
export type ConfirmState = { error: string | null; ok?: boolean; message?: string; href?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const s = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);

export async function extractAction(_prev: ExtractState, f: FormData): Promise<ExtractState> {
  const { ctx } = await requireCtx();
  try {
    const { captureId, draft } = await createCapture(ctx, String(f.get("transcript") ?? ""));
    return { error: null, captureId, draft };
  } catch (e) {
    return { error: friendly(e) };
  }
}

export async function confirmAction(_prev: ConfirmState, f: FormData): Promise<ConfirmState> {
  const { ctx } = await requireCtx();
  const captureId = s(f.get("capture_id"), 40);
  if (!UUID.test(captureId)) return { error: "That capture wasn't found. Please start again." };
  let payload: ConfirmPayload | null = null;
  try {
    payload = parsePayload(JSON.parse(String(f.get("payload") ?? "{}")));
  } catch {
    payload = null;
  }
  if (!payload) return { error: "I couldn't read that. Please check the fields and try again." };
  try {
    const r = await confirmCapture(ctx, captureId, payload);
    for (const p of ["/sales", "/purchases", "/expenses", "/summaries", "/products", "/dashboard", "/debts"]) revalidatePath(p);
    const href = r.type === "sale" ? `/sales/${r.id}` : r.type === "purchase" ? "/purchases" : r.type === "expense" ? "/expenses" : "/summaries";
    const label = { sale: "Sale", purchase: "Purchase", expense: "Expense", summary: "Summary" }[r.type] ?? "Record";
    return { error: null, ok: true, href, message: r.duplicate ? `${label} was already saved.` : `${label} saved.` };
  } catch (e) {
    return { error: friendly(e) };
  }
}

export async function discardAction(f: FormData) {
  const { ctx } = await requireCtx();
  const id = s(f.get("capture_id"), 40);
  if (UUID.test(id)) await discardCapture(ctx, id);
}
