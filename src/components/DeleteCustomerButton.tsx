"use client";

import { deleteCustomer } from "@/app/(app)/customers/actions";

export function DeleteCustomerButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={deleteCustomer}
      onSubmit={(e) => {
        if (!window.confirm(`Delete ${name}? Their notes are removed. This cannot be undone.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="rounded-full bg-amber/10 px-5 py-2.5 text-sm font-bold text-amber hover:bg-amber/20">
        Delete customer
      </button>
    </form>
  );
}
