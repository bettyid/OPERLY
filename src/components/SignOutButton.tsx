"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await authClient.signOut();
        router.push("/login");
        router.refresh();
      }}
      className="rounded-full bg-lilac-100 px-4 py-2 text-sm font-bold text-iris-700 hover:bg-lilac-200"
    >
      Log out
    </button>
  );
}
