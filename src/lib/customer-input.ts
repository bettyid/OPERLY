export const STATUSES = ["lead", "active", "inactive"] as const;
export type Status = (typeof STATUSES)[number];

export type CustomerInput = {
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  category: string | null;
  status: Status;
  notes: string | null;
  next_follow_up: string | null;
};

function clean(v: unknown, max: number): string | null {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, max) : null;
}

function validDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
}

export function parseCustomer(raw: Record<string, unknown>): { error: string } | { value: CustomerInput } {
  const name = clean(raw.name, 120);
  if (!name) return { error: "Enter the customer's name." };

  const email = clean(raw.email, 254);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "That email address doesn't look right." };

  const phone = clean(raw.phone, 30);
  if (phone && !/^[+()\d\s.-]{5,30}$/.test(phone)) {
    return { error: "Phone numbers can contain digits, spaces, + ( ) - and ." };
  }

  const statusRaw = String(raw.status ?? "lead").trim().toLowerCase();
  const status = (STATUSES as readonly string[]).includes(statusRaw) ? (statusRaw as Status) : "lead";

  const nextRaw = clean(raw.next_follow_up, 10);
  if (nextRaw && !validDate(nextRaw)) return { error: "Use a valid follow-up date." };

  return {
    value: {
      name,
      email,
      phone,
      company: clean(raw.company, 120),
      category: clean(raw.category, 60),
      status,
      notes: clean(raw.notes, 5000),
      next_follow_up: nextRaw,
    },
  };
}
