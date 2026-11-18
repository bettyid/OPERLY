import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { OnboardingForm } from "@/components/OnboardingForm";
import { query } from "@/lib/db";
import { getSession } from "@/lib/session";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const has = await query("select 1 from memberships where user_id = $1 limit 1", [session.user.id]);
  if (has.length > 0) redirect("/dashboard");

  return (
    <AuthShell title="Set up your workspace" subtitle="Tell us about your business. You can change this later.">
      <OnboardingForm />
    </AuthShell>
  );
}
