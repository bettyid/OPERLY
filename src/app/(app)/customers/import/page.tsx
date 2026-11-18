import Link from "next/link";
import { ImportForm } from "@/components/ImportForm";

export default function ImportCustomersPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/customers" className="text-sm font-bold text-iris-600 hover:underline">
        Back to customers
      </Link>
      <h1 className="mt-3 font-title text-4xl font-black tracking-tight sm:text-5xl">Import customers</h1>
      <div className="mt-6 rounded-[2rem] bg-white p-6 sm:p-8">
        <p className="leading-relaxed text-muted">
          Save your spreadsheet as a CSV file. The first row must name the columns. Only <strong className="text-ink">name</strong>{" "}
          is required. Optional columns: email, phone, company, category, status (lead, active or inactive), notes and
          next_follow_up (as YYYY-MM-DD). Up to 1,000 rows per file.
        </p>
        <div className="mt-6">
          <ImportForm />
        </div>
      </div>
    </div>
  );
}
