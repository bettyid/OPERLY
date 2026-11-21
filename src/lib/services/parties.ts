import { withTx } from "@/lib/db";
import { audit } from "./audit";
import { assertCan, DomainError, type Ctx } from "./permissions";

export async function createSupplier(
  ctx: Ctx,
  input: { name: string; phone?: string | null; email?: string | null; notes?: string | null },
): Promise<{ id: string }> {
  assertCan(ctx, "purchases.create");
  const name = (input.name ?? "").trim();
  if (!name) throw new DomainError("Enter the supplier's name.");
  if (name.length > 120) throw new DomainError("Keep the name under 120 characters.");
  const email = (input.email ?? "").trim() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new DomainError("That email address doesn't look right.");
  const phone = (input.phone ?? "").trim() || null;
  if (phone && !/^[+()\d\s.-]{5,30}$/.test(phone)) throw new DomainError("Phone numbers can contain digits, spaces, + ( ) - and .");

  return withTx(async (tx) => {
    const res = await tx.query(
      "insert into suppliers (business_id, name, phone, email, notes) values ($1,$2,$3,$4,$5) returning id",
      [ctx.businessId, name, phone, email, (input.notes ?? "").trim() || null],
    );
    await audit(tx, ctx, "supplier", res.rows[0].id, "create", null, { name });
    return { id: res.rows[0].id as string };
  });
}
