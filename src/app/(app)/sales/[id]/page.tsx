import Link from "next/link";
import { notFound } from "next/navigation";
import { ReceiptActions } from "@/components/ReceiptActions";
import { fmtQty } from "@/lib/action";
import { query } from "@/lib/db";
import { localeFor, moneyFormatter } from "@/lib/regions";
import { can } from "@/lib/services/permissions";
import { requireCtx } from "@/lib/session";
import { voidSaleAction } from "../actions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const methodLabel: Record<string, string> = { cash: "Cash", bank_transfer: "Bank transfer", card: "Card", other: "Other" };

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { ctx, business } = await requireCtx();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const [sale] = await query<{
    id: string; sale_number: string; sold_at: Date; subtotal: string; discount: string; total: string; amount_paid: string;
    status: string; void_reason: string | null; customer: string | null;
  }>(
    `select s.id, s.sale_number, s.sold_at, s.subtotal, s.discount, s.total, s.amount_paid, s.status, s.void_reason, c.name as customer
       from sales s left join customers c on c.business_id=s.business_id and c.id=s.customer_id
      where s.business_id=$1 and s.id=$2`,
    [business.id, id],
  );
  if (!sale) notFound();

  const items = await query<{ name: string; unit_name: string; quantity: string; unit_price: string; line_discount: string; line_total: string }>(
    `select p.name, i.unit_name, i.quantity, i.unit_price, i.line_discount, i.line_total
       from sale_items i join products p on p.business_id=i.business_id and p.id=i.product_id
      where i.business_id=$1 and i.sale_id=$2 order by i.id`,
    [business.id, id],
  );
  const pays = await query<{ amount: string; method: string; paid_at: Date; voided_at: Date | null }>(
    "select amount, method, paid_at, voided_at from payments where business_id=$1 and sale_id=$2 order by paid_at", [business.id, id]);

  const money = moneyFormatter(business.country, business.currency);
  const fmt = new Intl.DateTimeFormat(localeFor(business.country), { dateStyle: "medium", timeStyle: "short", timeZone: business.timezone });
  const owed = Number(sale.total) - Number(sale.amount_paid);
  const voided = sale.status === "voided";

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/sales" className="text-sm font-bold text-iris-600 hover:underline print:hidden">Back to sales</Link>
      <article className="mt-3 rounded-[2rem] bg-white p-6 sm:p-8 print:rounded-none print:p-0">
        <header className="text-center">
          <p className="font-display text-xl font-semibold">{business.name}</p>
          <p className="mt-1 text-sm text-muted">Receipt #{sale.sale_number}</p>
          <p className="text-sm text-muted">{fmt.format(new Date(sale.sold_at))}</p>
          {sale.customer && <p className="mt-1 text-sm font-bold">{sale.customer}</p>}
          {voided && <p className="mt-3 rounded-2xl bg-amber/10 px-4 py-2 text-sm font-bold text-amber">VOIDED{sale.void_reason ? `: ${sale.void_reason}` : ""}</p>}
        </header>

        <table className="mt-6 w-full text-sm">
          <thead><tr className="border-b border-edge text-xs font-bold text-muted">
            <th className="pb-2 text-left font-bold">Item</th><th className="pb-2 text-right font-bold">Amount</th>
          </tr></thead>
          <tbody className="divide-y divide-edge">
            {items.map((i, n) => (
              <tr key={n}>
                <td className="py-2">
                  <p className="font-semibold">{i.name}</p>
                  <p className="text-xs text-muted">{fmtQty(i.quantity)} {i.unit_name} × {money.format(Number(i.unit_price))}{Number(i.line_discount) > 0 ? ` (−${money.format(Number(i.line_discount))})` : ""}</p>
                </td>
                <td className="py-2 text-right">{money.format(Number(i.line_total))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="mt-4 space-y-1 border-t border-edge pt-4 text-sm">
          {Number(sale.discount) > 0 && <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{money.format(Number(sale.subtotal))}</dd></div>}
          {Number(sale.discount) > 0 && <div className="flex justify-between"><dt className="text-muted">Discount</dt><dd>−{money.format(Number(sale.discount))}</dd></div>}
          <div className="flex justify-between font-display text-lg font-semibold"><dt>Total</dt><dd>{money.format(Number(sale.total))}</dd></div>
          {pays.filter((p) => !p.voided_at).map((p, n) => (
            <div key={n} className="flex justify-between text-muted"><dt>Paid by {methodLabel[p.method]?.toLowerCase()}</dt><dd>{money.format(Number(p.amount))}</dd></div>
          ))}
          {!voided && <div className={`flex justify-between font-bold ${owed > 0 ? "text-amber" : "text-mint"}`}><dt>{owed > 0 ? "Balance due" : "Paid in full"}</dt><dd>{owed > 0 ? money.format(owed) : ""}</dd></div>}
        </dl>
        <p className="mt-6 text-center text-xs text-muted">Thank you for your business.</p>
      </article>
      <div className="mt-4">
        <ReceiptActions saleId={sale.id} canVoid={can(ctx.role, "sales.void") && !voided} voidAction={voidSaleAction} />
      </div>
    </div>
  );
}
