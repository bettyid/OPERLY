import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { AuthShell } from "@/components/AuthShell";
import { getSession } from "@/lib/session";

export default async function RegisterPage() {
  if (await getSession()) redirect("/dashboard");
  return (
    <AuthShell title="Create your account" subtitle="Start on the Free plan. No card needed.">
      <AuthForm mode="register" />
    </AuthShell>
  );
}
