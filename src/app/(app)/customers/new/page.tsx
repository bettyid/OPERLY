import Link from "next/link";
import { CustomerForm } from "@/components/CustomerForm";
import { createCustomer } from "../actions";

export default function NewCustomerPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/customers" className="text-sm font-bold text-iris-600 hover:underline">
        Back to customers
      </Link>
      <h1 className="mt-3 font-title text-4xl font-black tracking-tight sm:text-5xl">Add customer</h1>
      <div className="mt-6 rounded-[2rem] bg-white p-6 sm:p-8">
        <CustomerForm action={createCustomer} submitLabel="Add customer" />
      </div>
    </div>
  );
}
