import { Capture } from "@/components/Capture";
import { localeFor } from "@/lib/regions";
import { loadCatalog } from "@/lib/services/capture";
import { can } from "@/lib/services/permissions";
import { requireCtx } from "@/lib/session";
import { confirmAction, discardAction, extractAction } from "./actions";

export default async function CapturePage() {
  const { ctx, business } = await requireCtx();
  const cat = await loadCatalog(ctx);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: business.timezone }).format(new Date());
  const speechLang = business.country && business.country !== "OTHER" ? `en-${business.country}` : "en-US";
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-title text-4xl font-black tracking-tight sm:text-5xl">Speak or type</h1>
      <p className="mt-2 mb-6 text-muted">Tell Operly what happened in your own words. It prepares the record, you check it, then it is saved.</p>
      <Capture products={cat.products} customers={cat.customers} suppliers={cat.suppliers} today={today} currency={business.currency}
        locale={localeFor(business.country)} speechLang={speechLang} canDiscount={can(ctx.role, "sales.discount")}
        extract={extractAction} confirm={confirmAction} discard={discardAction} />
    </div>
  );
}
