import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { query } from "./db";

export type Business = { id: string; name: string; industry: string | null; currency: string; plan: string };

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** Signed-in user plus their business. Redirects to login or onboarding when missing. */
export async function requireWorkspace() {
  const session = await getSession();
  if (!session) redirect("/login");

  const rows = await query<Business>(
    `select b.id, b.name, b.industry, b.currency, b.plan
       from memberships m join businesses b on b.id = m.business_id
      where m.user_id = $1
      order by m.created_at asc
      limit 1`,
    [session.user.id],
  );
  if (rows.length === 0) redirect("/onboarding");

  return { user: session.user, business: rows[0] };
}
