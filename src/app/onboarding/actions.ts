"use server";

import { redirect } from "next/navigation";
import { getPool } from "@/lib/db";
import { COUNTRIES, CURRENCY_CODES, isValidTimezone } from "@/lib/regions";
import { getSession } from "@/lib/session";

export type OnboardingState = { error: string | null };

export async function createBusiness(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const industry = String(formData.get("industry") ?? "").trim() || null;
  const currency = String(formData.get("currency") ?? "USD");
  const country = String(formData.get("country") ?? "");
  const timezone = String(formData.get("timezone") ?? "");

  if (name.length < 2) return { error: "Enter your business name." };
  if (name.length > 80) return { error: "Keep the business name under 80 characters." };
  if (!COUNTRIES.some((c) => c.code === country)) return { error: "Choose your country." };
  if (!CURRENCY_CODES.includes(currency)) return { error: "Choose a currency from the list." };
  if (!isValidTimezone(timezone)) return { error: "Choose a valid time zone." };

  const client = await getPool().connect();
  try {
    await client.query("begin");
    const existing = await client.query("select 1 from memberships where user_id = $1 limit 1", [session.user.id]);
    if (existing.rowCount === 0) {
      const biz = await client.query(
        "insert into businesses (name, industry, currency, country, timezone) values ($1, $2, $3, $4, $5) returning id",
        [name, industry, currency, country, timezone],
      );
      await client.query("insert into memberships (business_id, user_id, role) values ($1, $2, 'owner')", [
        biz.rows[0].id,
        session.user.id,
      ]);
      await client.query(
        "insert into activities (business_id, actor, kind, summary) values ($1, 'system', 'workspace', $2)",
        [biz.rows[0].id, `Workspace created for ${name}`],
      );
    }
    await client.query("commit");
  } catch {
    await client.query("rollback");
    return { error: "We couldn't set up your workspace. Try again." };
  } finally {
    client.release();
  }

  redirect("/dashboard");
}
