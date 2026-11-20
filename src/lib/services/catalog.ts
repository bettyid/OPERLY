import { withTx, type Tx } from "@/lib/db";
import { audit } from "./audit";
import { D } from "./money";
import { assertCan, DomainError, type Ctx } from "./permissions";
import { parseMoney } from "./validate";

export type ProductInput = {
  name: string;
  sku?: string | null;
  description?: string | null;
  categoryName?: string | null;
  baseUnit?: string;
  minStock?: number | string;
  baseSellPrice?: number | string | null;
  units?: { name: string; factor: number | string; sellPrice?: number | string | null }[];
};

async function categoryId(tx: Tx, ctx: Ctx, name?: string | null): Promise<string | null> {
  const n = (name ?? "").trim();
  if (!n) return null;
  const res = await tx.query(
    `insert into product_categories (business_id, name) values ($1,$2)
     on conflict (business_id, name) do update set name = excluded.name returning id`,
    [ctx.businessId, n.slice(0, 80)],
  );
  return res.rows[0].id;
}

export async function createProduct(ctx: Ctx, input: ProductInput): Promise<{ id: string }> {
  assertCan(ctx, "products.manage");
  const name = (input.name ?? "").trim();
  if (!name) throw new DomainError("Enter the product name.");
  if (name.length > 120) throw new DomainError("Keep the product name under 120 characters.");
  const baseUnit = (input.baseUnit ?? "unit").trim().toLowerCase() || "unit";
  const minStock = D(input.minStock ?? 0);
  if (minStock.isNegative()) throw new DomainError("Minimum stock cannot be negative.");

  const extra = input.units ?? [];
  const names = new Set([baseUnit]);
  for (const u of extra) {
    const n = u.name.trim().toLowerCase();
    if (!n) throw new DomainError("Every unit needs a name.");
    if (names.has(n)) throw new DomainError(`The unit "${n}" is listed twice.`);
    names.add(n);
    const f = D(u.factor);
    if (!f.isFinite() || f.lte(0) || !f.equals(f.toDecimalPlaces(4))) {
      throw new DomainError(`The unit "${n}" must hold a positive number of ${baseUnit}s.`);
    }
  }

  return withTx(async (tx) => {
    const cat = await categoryId(tx, ctx, input.categoryName);
    const res = await tx.query(
      `insert into products (business_id, category_id, sku, name, description, base_unit, min_stock)
       values ($1,$2,$3,$4,$5,$6,$7) returning id`,
      [ctx.businessId, cat, input.sku?.trim() || null, name, input.description?.trim() || null, baseUnit, minStock.toString()],
    );
    const id: string = res.rows[0].id;

    const base = input.baseSellPrice == null ? null : parseMoney(input.baseSellPrice, "Selling price", { allowZero: true });
    await tx.query(
      "insert into product_units (business_id, product_id, name, factor, sell_price, is_base) values ($1,$2,$3,1,$4,true)",
      [ctx.businessId, id, baseUnit, base?.toString() ?? null],
    );
    if (base) {
      await tx.query(
        "insert into product_price_history (business_id, product_id, unit_name, old_price, new_price, changed_by) values ($1,$2,$3,null,$4,$5)",
        [ctx.businessId, id, baseUnit, base.toString(), ctx.userId],
      );
    }
    for (const u of extra) {
      const price = u.sellPrice == null ? null : parseMoney(u.sellPrice, "Selling price", { allowZero: true });
      const n = u.name.trim().toLowerCase();
      await tx.query(
        "insert into product_units (business_id, product_id, name, factor, sell_price, is_base) values ($1,$2,$3,$4,$5,false)",
        [ctx.businessId, id, n, D(u.factor).toString(), price?.toString() ?? null],
      );
      if (price) {
        await tx.query(
          "insert into product_price_history (business_id, product_id, unit_name, old_price, new_price, changed_by) values ($1,$2,$3,null,$4,$5)",
          [ctx.businessId, id, n, price.toString(), ctx.userId],
        );
      }
    }
    await audit(tx, ctx, "product", id, "create", null, { name, baseUnit, units: extra });
    return { id };
  });
}

export async function updateProduct(
  ctx: Ctx,
  productId: string,
  patch: {
    name?: string;
    description?: string | null;
    sku?: string | null;
    categoryName?: string | null;
    minStock?: number | string;
    prices?: Record<string, number | string>;
  },
) {
  assertCan(ctx, "products.manage");
  return withTx(async (tx) => {
    const cur = await tx.query("select * from products where business_id = $1 and id = $2 for update", [ctx.businessId, productId]);
    if (!cur.rows[0]) throw new DomainError("Product not found.", "not_found");
    const before = cur.rows[0];

    const name = patch.name !== undefined ? patch.name.trim() : before.name;
    if (!name) throw new DomainError("Enter the product name.");
    const cat = patch.categoryName !== undefined ? await categoryId(tx, ctx, patch.categoryName) : before.category_id;
    const minStock = patch.minStock !== undefined ? D(patch.minStock) : D(before.min_stock);
    if (minStock.isNegative()) throw new DomainError("Minimum stock cannot be negative.");

    await tx.query(
      `update products set name=$3, description=$4, sku=$5, category_id=$6, min_stock=$7, updated_at=now()
        where business_id=$1 and id=$2`,
      [
        ctx.businessId, productId, name,
        patch.description !== undefined ? patch.description : before.description,
        patch.sku !== undefined ? patch.sku?.trim() || null : before.sku,
        cat, minStock.toString(),
      ],
    );

    const priceChanges: Record<string, { from: string | null; to: string }> = {};
    for (const [unitName, raw] of Object.entries(patch.prices ?? {})) {
      const price = parseMoney(raw, "Selling price", { allowZero: true });
      const u = await tx.query("select sell_price from product_units where business_id=$1 and product_id=$2 and name=$3 for update", [
        ctx.businessId, productId, unitName.toLowerCase(),
      ]);
      if (!u.rows[0]) throw new DomainError(`The unit "${unitName}" does not exist on this product.`);
      const old = u.rows[0].sell_price as string | null;
      if (old === null || !D(old).equals(price)) {
        await tx.query("update product_units set sell_price=$4 where business_id=$1 and product_id=$2 and name=$3", [
          ctx.businessId, productId, unitName.toLowerCase(), price.toString(),
        ]);
        await tx.query(
          "insert into product_price_history (business_id, product_id, unit_name, old_price, new_price, changed_by) values ($1,$2,$3,$4,$5,$6)",
          [ctx.businessId, productId, unitName.toLowerCase(), old, price.toString(), ctx.userId],
        );
        priceChanges[unitName.toLowerCase()] = { from: old, to: price.toString() };
      }
    }
    await audit(
      tx, ctx, "product", productId, "update",
      { name: before.name, description: before.description, sku: before.sku, min_stock: before.min_stock },
      { name, minStock: minStock.toString(), priceChanges },
    );
  });
}

export async function archiveProduct(ctx: Ctx, productId: string, archived = true) {
  assertCan(ctx, "products.manage");
  return withTx(async (tx) => {
    const res = await tx.query(
      "update products set archived_at = case when $3 then now() else null end, updated_at = now() where business_id=$1 and id=$2 returning id",
      [ctx.businessId, productId, archived],
    );
    if (!res.rows[0]) throw new DomainError("Product not found.", "not_found");
    await audit(tx, ctx, "product", productId, "archive", null, { archived });
  });
}
