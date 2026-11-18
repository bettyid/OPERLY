import { csvCell } from "@/lib/csv";
import { query } from "@/lib/db";
import { requireWorkspace } from "@/lib/session";

type Row = {
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  category: string | null;
  status: string;
  notes: string | null;
  next_follow_up: string | null;
};

export async function GET() {
  const { business } = await requireWorkspace();
  const rows = await query<Row>(
    `select name, email, phone, company, category, status, notes, to_char(next_follow_up, 'YYYY-MM-DD') as next_follow_up
       from customers where business_id = $1 order by created_at desc`,
    [business.id],
  );
  const cols = ["name", "email", "phone", "company", "category", "status", "notes", "next_follow_up"] as const;
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\r\n");

  return new Response("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="operly-customers.csv"',
      "Cache-Control": "no-store",
    },
  });
}
