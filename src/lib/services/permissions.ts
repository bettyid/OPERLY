export type Role = "owner" | "admin" | "member";

export type Permission =
  | "sales.create"
  | "sales.discount"
  | "sales.void"
  | "purchases.create"
  | "purchases.void"
  | "products.manage"
  | "inventory.adjust"
  | "expenses.manage"
  | "customers.manage"
  | "payments.receive"
  | "costs.view"
  | "reports.financial"
  | "audit.view";

const ADMIN: Permission[] = [
  "sales.create", "sales.discount", "sales.void", "purchases.create", "purchases.void", "products.manage",
  "inventory.adjust", "expenses.manage", "customers.manage", "payments.receive", "costs.view",
  "reports.financial", "audit.view",
];

/** Staff ("member") can sell and keep customers, but cannot discount, void, see costs or profit. */
const STAFF: Permission[] = ["sales.create", "customers.manage", "payments.receive"];

export function can(role: Role, permission: Permission): boolean {
  if (role === "owner" || role === "admin") return ADMIN.includes(permission);
  return STAFF.includes(permission);
}

export class DomainError extends Error {
  constructor(
    message: string,
    public code: string = "invalid",
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export type Ctx = {
  businessId: string;
  userId: string;
  role: Role;
  currency: string;
  timezone: string;
  costingMethod: "weighted_average" | "fifo";
  allowNegativeStock: boolean;
};

export function assertCan(ctx: Ctx, permission: Permission) {
  if (!can(ctx.role, permission)) {
    throw new DomainError("You don't have permission to do that.", "forbidden");
  }
}
