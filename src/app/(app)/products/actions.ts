"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { friendly, type ActionState } from "@/lib/action";
import { archiveProduct, createProduct, updateProduct } from "@/lib/services/catalog";
import { requireCtx } from "@/lib/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function createProductAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx();
  const names = f.getAll("unit_name").map(String);
  const factors = f.getAll("unit_factor").map(String);
  const prices = f.getAll("unit_price").map(String);
  const units = names
    .map((name, i) => ({ name: name.trim(), factor: factors[i]?.trim() ?? "", sellPrice: prices[i]?.trim() || null }))
    .filter((u) => u.name || u.factor);
  let id: string;
  try {
    ({ id } = await createProduct(ctx, {
      name: str(f, "name"),
      sku: str(f, "sku") || null,
      categoryName: str(f, "category") || null,
      baseUnit: str(f, "base_unit") || "unit",
      minStock: str(f, "min_stock") || "0",
      baseSellPrice: str(f, "base_price") || null,
      units,
    }));
  } catch (e) {
    return { error: friendly(e) };
  }
  revalidatePath("/products");
  redirect(`/products/${id}`);
}

export async function updateProductAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx();
  const id = str(f, "id");
  if (!UUID.test(id)) return { error: "Product not found." };
  const unitNames = f.getAll("price_unit").map(String);
  const unitPrices = f.getAll("price_value").map(String);
  const prices: Record<string, string> = {};
  unitNames.forEach((n, i) => {
    if (unitPrices[i]?.trim()) prices[n] = unitPrices[i].trim();
  });
  try {
    await updateProduct(ctx, id, {
      name: str(f, "name"),
      sku: str(f, "sku") || null,
      description: str(f, "description") || null,
      categoryName: str(f, "category") || null,
      minStock: str(f, "min_stock") || "0",
      prices,
    });
  } catch (e) {
    return { error: friendly(e) };
  }
  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  return { error: null, ok: true };
}

export async function archiveProductAction(f: FormData) {
  const { ctx } = await requireCtx();
  const id = str(f, "id");
  if (UUID.test(id)) await archiveProduct(ctx, id, str(f, "archive") !== "false");
  revalidatePath("/products");
  redirect("/products");
}
