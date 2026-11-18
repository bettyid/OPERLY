"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { ErrorNote, Field, PrimaryButton } from "./ui";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");

    if (mode === "register") {
      const name = String(data.get("name") ?? "").trim();
      if (!name) {
        setError("Enter your name.");
        setPending(false);
        return;
      }
      const { error } = await authClient.signUp.email({ name, email, password });
      if (error) {
        setError(error.message ?? "We couldn't create your account. Check your details and try again.");
        setPending(false);
        return;
      }
      router.push("/onboarding");
    } else {
      const { error } = await authClient.signIn.email({ email, password });
      if (error) {
        setError("That email and password don't match. Check them and try again.");
        setPending(false);
        return;
      }
      router.push("/dashboard");
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {mode === "register" && <Field label="Your name" id="name" autoComplete="name" required />}
      <Field label="Email" id="email" type="email" autoComplete="email" required />
      <Field
        label="Password"
        id="password"
        type="password"
        autoComplete={mode === "register" ? "new-password" : "current-password"}
        minLength={8}
        required
      />
      {mode === "register" && <p className="text-xs text-muted">Use at least 8 characters.</p>}
      <ErrorNote message={error} />
      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "Please wait" : mode === "register" ? "Create account" : "Log in"}
      </PrimaryButton>
      <p className="pt-2 text-center text-sm text-muted">
        {mode === "register" ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-iris-600 hover:underline">
              Log in
            </Link>
          </>
        ) : (
          <>
            New to Operly?{" "}
            <Link href="/register" className="font-bold text-iris-600 hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
