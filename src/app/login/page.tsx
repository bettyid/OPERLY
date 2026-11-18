import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { AuthShell } from "@/components/AuthShell";
import { getSession } from "@/lib/session";

export default async function LoginPage() {
  if (await getSession()) redirect("/dashboard");
  return (
    <AuthShell title="Welcome back" subtitle="Log in to your Operly workspace.">
      <AuthForm mode="login" />
    </AuthShell>
  );
}
