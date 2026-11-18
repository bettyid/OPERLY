"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseCsv } from "@/lib/csv";
import { parseCustomer } from "@/lib/customer-input";
import { getPool, query } from "@/lib/db";
import { requireWorkspace } from "@/lib/session";

export type FormState = { error: string | null; saved?: boolean; message?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fields(formData: FormData) {
  return Object.fromEntries(
    ["name", "email", "phone", "company", "category", "status", "notes", "next_follow_up"].map((k) => [k, formData.get(k)]),
  );
}

export async function createCustomer(_prev: FormState, formData: FormData): Promise<FormState> {
  const { business } = await requireWorkspace();
  const parsed = parseCustomer(fields(formData));
  if ("error" in parsed) return { error: parsed.error };
  const c = parsed.value;

  const [row] = await query<{ id: string }>(
    `insert into customers (business_id, name, email, phone, company, category, status, notes, next_follow_up)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
    [business.id, c.name, c.email, c.phone, c.company, c.category, c.status, c.notes, c.next_follow_up],
  );
  await query(
    "insert into activities (business_id, customer_id, actor, kind, summary) values ($1,$2,'user','customer',$3)",
    [business.id, row.id, `Added customer ${c.name}`],
  );
  revalidatePath("/customers");
  redirect(`/customers/${row.id}`);
}

export async function updateCustomer(_prev: FormState, formData: FormData): Promise<FormState> {
  const { business } = await requireWorkspace();
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return { error: "We couldn't find that customer." };

  const parsed = parseCustomer(fields(formData));
  if ("error" in parsed) return { error: parsed.error };
  const c = parsed.value;

  const rows = await query(
    `update customers set name=$3, email=$4, phone=$5, company=$6, category=$7, status=$8, notes=$9,
            next_follow_up=$10, updated_at=now()
      where id=$1 and business_id=$2 returning id`,
    [id, business.id, c.name, c.email, c.phone, c.company, c.category, c.status, c.notes, c.next_follow_up],
  );
  if (rows.length === 0) return { error: "We couldn't find that customer." };

  await query(
    "insert into activities (business_id, customer_id, actor, kind, summary) values ($1,$2,'user','customer',$3)",
    [business.id, id, `Updated customer ${c.name}`],
  );
  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  return { error: null, saved: true };
}

export async function deleteCustomer(formData: FormData) {
  const { business } = await requireWorkspace();
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) redirect("/customers");

  const rows = await query<{ name: string }>("delete from customers where id=$1 and business_id=$2 returning name", [
    id,
    business.id,
  ]);
  if (rows[0]) {
    await query("insert into activities (business_id, actor, kind, summary) values ($1,'user','customer',$2)", [
      business.id,
      `Removed customer ${rows[0].name}`,
    ]);
  }
  revalidatePath("/customers");
  redirect("/customers");
}

const MAX_BYTES = 1_000_000;
const MAX_ROWS = 1000;

export async function importCustomers(_prev: FormState, formData: FormData): Promise<FormState> {
  const { business } = await requireWorkspace();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file to import." };
  if (file.size > MAX_BYTES) return { error: "That file is over 1 MB. Split it into smaller files." };

  const rows = parseCsv(await file.text());
  if (rows.length < 2) return { error: "The file needs a header row and at least one customer." };

  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/[\s-]+/g, "_"));
  if (!header.includes("name")) return { error: 'The first row must include a "name" column.' };
  const body = rows.slice(1, MAX_ROWS + 1);

  let imported = 0;
  let skipped = 0;
  const client = await getPool().connect();
  try {
    await client.query("begin");
    for (const r of body) {
      const raw: Record<string, string> = {};
      header.forEach((h, i) => (raw[h] = r[i] ?? ""));
      const parsed = parseCustomer(raw);
      if ("error" in parsed) {
        skipped++;
        continue;
      }
      const c = parsed.value;
      await client.query(
        `insert into customers (business_id, name, email, phone, company, category, status, notes, next_follow_up)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [business.id, c.name, c.email, c.phone, c.company, c.category, c.status, c.notes, c.next_follow_up],
      );
      imported++;
    }
    if (imported > 0) {
      await client.query(
        "insert into activities (business_id, actor, kind, summary) values ($1,'user','import',$2)",
        [business.id, `Imported ${imported} customers from a CSV file`],
      );
    }
    await client.query("commit");
  } catch {
    await client.query("rollback");
    return { error: "The import failed and nothing was added. Check the file and try again." };
  } finally {
    client.release();
  }

  revalidatePath("/customers");
  const extra = rows.length - 1 > MAX_ROWS ? ` Only the first ${MAX_ROWS} rows were read.` : "";
  return {
    error: null,
    saved: true,
    message: `Imported ${imported} ${imported === 1 ? "customer" : "customers"}${skipped ? `, skipped ${skipped} rows with a missing name or invalid details` : ""}.${extra}`,
  };
}
