import Link from "next/link";
import { redirect } from "next/navigation";
import { ProductForm } from "@/components/ProductForm";
import { can } from "@/lib/services/permissions";
import { requireCtx } from "@/lib/session";
import { createProductAction } from "../actions";

export default async function NewProductPage() {
  const { ctx } = await requireCtx();
  if (!can(ctx.role, "products.manage")) redirect("/products");
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/products" className="text-sm font-bold text-iris-600 hover:underline">Back to products</Link>
      <h1 className="mt-3 font-title text-4xl font-black tracking-tight sm:text-5xl">Add product</h1>
      <div className="mt-6 rounded-[2rem] bg-white p-6 sm:p-8">
        <ProductForm action={createProductAction} />
      </div>
    </div>
  );
}
