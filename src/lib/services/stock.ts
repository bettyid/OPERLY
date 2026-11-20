import { withTx } from "@/lib/db";
import { audit } from "./audit";
import { addMovement, currentUnitCost, defaultLocation, lockProducts, stockOf, type MovementKind } from "./inventory";
import { D } from "./money";
import { assertCan, DomainError, type Ctx } from "./permissions";
import { parseMoney } from "./validate";

/** Manual stock events: opening stock, damaged goods, returns and corrections. Always recorded as ledger rows. */
export async function adjustStock(
  ctx: Ctx,
  input: {
    productId: string;
    kind: Extract<MovementKind, "opening" | "damage" | "adjustment" | "return_in" | "return_out">;
    quantity: number | string; // signed for "adjustment"; positive for the others
    unitCost?: number | string;
    reason?: string;
  },
) {
  assertCan(ctx, "inventory.adjust");
  const reason = (input.reason ?? "").trim();
  if (input.kind !== "opening" && reason.length < 3) throw new DomainError("Give a reason for this stock change.");
  let qty = D(input.quantity);
  if (!qty.isFinite() || qty.isZero() || !qty.equals(qty.toDecimalPlaces(3))) throw new DomainError("Enter a valid quantity (up to 3 decimals).");
  if (input.kind !== "adjustment" && qty.isNegative()) throw new DomainError("Enter the quantity as a positive number.");
  if (input.kind === "damage" || input.kind === "return_out") qty = qty.neg();

  return withTx(async (tx) => {
    await lockProducts(tx, ctx, [input.productId]);
    const locationId = await defaultLocation(tx, ctx);
    let unitCost;
    if (input.kind === "opening") {
      if (input.unitCost === undefined) throw new DomainError("Enter what each unit cost you for opening stock.");
      unitCost = parseMoney(input.unitCost, "Unit cost", { allowZero: true });
    } else if (input.unitCost !== undefined && qty.gt(0)) {
      unitCost = parseMoney(input.unitCost, "Unit cost", { allowZero: true });
    } else {
      unitCost = await currentUnitCost(tx, ctx, input.productId);
    }
    if (qty.isNegative() && !ctx.allowNegativeStock) {
      const { qty: have } = await stockOf(tx, ctx, input.productId, locationId);
      if (have.plus(qty).isNegative()) throw new DomainError("That would take stock below zero.", "insufficient_stock");
    }
    let valueDelta = unitCost.times(qty).toDecimalPlaces(4);
    if (qty.isNegative()) {
      const { qty: have, value } = await stockOf(tx, ctx, input.productId);
      if (have.plus(qty).isZero()) valueDelta = value.neg();
    }
    const id = await addMovement(tx, ctx, { productId: input.productId, locationId, kind: input.kind, quantityDelta: qty, unitCost, valueDelta, reason: reason || null });
    await audit(tx, ctx, "inventory", String(id), "create", null, { kind: input.kind, quantity: qty.toString() }, reason || null);
    return { movementId: id };
  });
}
