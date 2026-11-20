-- Better Auth tables
create table if not exists "user" (
  "id" text primary key,
  "name" text not null,
  "email" text not null unique,
  "emailVerified" boolean not null default false,
  "image" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists "session" (
  "id" text primary key,
  "expiresAt" timestamptz not null,
  "token" text not null unique,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "ipAddress" text,
  "userAgent" text,
  "userId" text not null references "user"("id") on delete cascade
);
create index if not exists session_user_idx on "session"("userId");

create table if not exists "account" (
  "id" text primary key,
  "accountId" text not null,
  "providerId" text not null,
  "userId" text not null references "user"("id") on delete cascade,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  "scope" text,
  "password" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index if not exists account_user_idx on "account"("userId");

create table if not exists "verification" (
  "id" text primary key,
  "identifier" text not null,
  "value" text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

-- Operly tables. Every business record carries business_id, and every query filters on it.
create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  currency text not null default 'USD',
  plan text not null default 'free',
  created_at timestamptz not null default now()
);
alter table businesses add column if not exists country text;
alter table businesses add column if not exists timezone text not null default 'UTC';

create table if not exists memberships (
  business_id uuid not null references businesses(id) on delete cascade,
  user_id text not null references "user"("id") on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);
create index if not exists memberships_user_idx on memberships(user_id);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  company text,
  category text,
  status text not null default 'lead' check (status in ('lead', 'active', 'inactive')),
  notes text,
  next_follow_up date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists customers_business_idx on customers(business_id, created_at desc);

create table if not exists deals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  title text not null,
  value numeric(14,2) not null default 0,
  stage text not null default 'new' check (stage in ('new', 'contacted', 'interested', 'negotiation', 'won', 'lost')),
  expected_close date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table deals add column if not exists closed_at timestamptz;
create index if not exists deals_business_idx on deals(business_id, stage);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  deal_id uuid references deals(id) on delete set null,
  title text not null,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  due_date date,
  done boolean not null default false,
  created_by text not null default 'user',
  created_at timestamptz not null default now()
);
create index if not exists tasks_business_idx on tasks(business_id, done, due_date);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  deal_id uuid references deals(id) on delete set null,
  actor text not null default 'user',
  kind text not null,
  summary text not null,
  created_at timestamptz not null default now()
);
create index if not exists activities_business_idx on activities(business_id, created_at desc);

-- =====================================================================
-- Business Manager (v2). Additive and idempotent. The old CRM "deals"
-- table is kept as an archive and is no longer used by new features.
-- Rules: money is numeric (never float); quantities live in the ledger;
-- every row carries business_id and cross-table references are composite
-- (business_id, id) so one business can never point at another's rows.
-- =====================================================================
alter table businesses add column if not exists costing_method text not null default 'weighted_average';
alter table businesses add column if not exists allow_negative_stock boolean not null default false;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'businesses_costing_method_chk') then
    alter table businesses add constraint businesses_costing_method_chk check (costing_method in ('weighted_average', 'fifo'));
  end if;
end $$;

alter table customers add column if not exists archived_at timestamptz;
create unique index if not exists customers_biz_id_uq on customers(business_id, id);

create table if not exists business_counters (
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  value bigint not null default 0,
  primary key (business_id, name)
);

create table if not exists stock_locations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (business_id, id),
  unique (business_id, name)
);
create unique index if not exists stock_locations_default_uq on stock_locations(business_id) where is_default;

create table if not exists product_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (business_id, id),
  unique (business_id, name)
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  category_id uuid,
  sku text,
  name text not null,
  description text,
  base_unit text not null default 'unit',
  min_stock numeric(14,3) not null default 0 check (min_stock >= 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  foreign key (business_id, category_id) references product_categories(business_id, id) on delete set null (category_id)
);
create unique index if not exists products_sku_uq on products(business_id, lower(sku)) where sku is not null;
create index if not exists products_name_idx on products(business_id, lower(name));

-- Stock is always counted in the product's base unit. Other selling units say how many base units they hold.
create table if not exists product_units (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  product_id uuid not null,
  name text not null,
  factor numeric(14,4) not null check (factor > 0),
  sell_price numeric(14,2) check (sell_price >= 0),
  is_base boolean not null default false,
  unique (business_id, id),
  unique (product_id, name),
  check (not is_base or factor = 1),
  foreign key (business_id, product_id) references products(business_id, id) on delete cascade
);
create unique index if not exists product_units_base_uq on product_units(product_id) where is_base;

create table if not exists product_price_history (
  id bigserial primary key,
  business_id uuid not null references businesses(id) on delete cascade,
  product_id uuid not null,
  unit_name text not null,
  old_price numeric(14,2),
  new_price numeric(14,2),
  changed_by text,
  changed_at timestamptz not null default now(),
  foreign key (business_id, product_id) references products(business_id, id) on delete cascade
);

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (business_id, id)
);

create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  sale_number bigint not null,
  customer_id uuid,
  location_id uuid not null,
  sold_at timestamptz not null default now(),
  currency char(3) not null,
  subtotal numeric(14,2) not null check (subtotal >= 0),
  discount numeric(14,2) not null default 0 check (discount >= 0),
  total numeric(14,2) not null check (total >= 0),
  amount_paid numeric(14,2) not null default 0 check (amount_paid >= 0),
  status text not null default 'completed' check (status in ('completed', 'voided')),
  source text not null default 'manual' check (source in ('manual', 'pos', 'voice', 'ocr', 'summary', 'import')),
  notes text,
  idempotency_key text,
  created_by text,
  voided_at timestamptz,
  void_reason text,
  created_at timestamptz not null default now(),
  unique (business_id, id),
  unique (business_id, sale_number),
  foreign key (business_id, customer_id) references customers(business_id, id) on delete set null (customer_id),
  foreign key (business_id, location_id) references stock_locations(business_id, id)
);
create unique index if not exists sales_idem_uq on sales(business_id, idempotency_key) where idempotency_key is not null;
create index if not exists sales_biz_date_idx on sales(business_id, sold_at desc);
create index if not exists sales_customer_idx on sales(business_id, customer_id);

create table if not exists sale_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  sale_id uuid not null,
  product_id uuid not null,
  unit_name text not null,
  unit_factor numeric(14,4) not null check (unit_factor > 0),
  quantity numeric(14,3) not null check (quantity > 0),
  base_quantity numeric(14,3) not null check (base_quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  line_discount numeric(14,2) not null default 0 check (line_discount >= 0),
  line_total numeric(14,2) not null check (line_total >= 0),
  cogs numeric(14,2) not null default 0,
  unique (business_id, id),
  foreign key (business_id, sale_id) references sales(business_id, id) on delete cascade,
  foreign key (business_id, product_id) references products(business_id, id)
);
create index if not exists sale_items_sale_idx on sale_items(sale_id);
create index if not exists sale_items_product_idx on sale_items(business_id, product_id);

create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  purchase_number bigint not null,
  supplier_id uuid not null,
  location_id uuid not null,
  purchased_at timestamptz not null default now(),
  currency char(3) not null,
  subtotal numeric(14,2) not null check (subtotal >= 0),
  extra_costs numeric(14,2) not null default 0 check (extra_costs >= 0),
  total numeric(14,2) not null check (total >= 0),
  amount_paid numeric(14,2) not null default 0 check (amount_paid >= 0),
  status text not null default 'completed' check (status in ('completed', 'voided')),
  source text not null default 'manual' check (source in ('manual', 'pos', 'voice', 'ocr', 'summary', 'import')),
  notes text,
  idempotency_key text,
  created_by text,
  voided_at timestamptz,
  void_reason text,
  created_at timestamptz not null default now(),
  unique (business_id, id),
  unique (business_id, purchase_number),
  foreign key (business_id, supplier_id) references suppliers(business_id, id),
  foreign key (business_id, location_id) references stock_locations(business_id, id)
);
create unique index if not exists purchases_idem_uq on purchases(business_id, idempotency_key) where idempotency_key is not null;
create index if not exists purchases_biz_date_idx on purchases(business_id, purchased_at desc);

-- Every purchase line keeps its own actual price. Rows are never overwritten by later purchases.
create table if not exists purchase_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  purchase_id uuid not null,
  product_id uuid not null,
  unit_name text not null,
  unit_factor numeric(14,4) not null check (unit_factor > 0),
  quantity numeric(14,3) not null check (quantity > 0),
  base_quantity numeric(14,3) not null check (base_quantity > 0),
  unit_cost numeric(14,2) not null check (unit_cost >= 0),
  line_total numeric(14,2) not null check (line_total >= 0),
  landed_total numeric(14,2) not null check (landed_total >= 0),
  base_unit_cost numeric(18,6) not null check (base_unit_cost >= 0),
  unique (business_id, id),
  foreign key (business_id, purchase_id) references purchases(business_id, id) on delete cascade,
  foreign key (business_id, product_id) references products(business_id, id)
);
create index if not exists purchase_items_product_idx on purchase_items(business_id, product_id);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  sale_id uuid,
  purchase_id uuid,
  amount numeric(14,2) not null check (amount > 0),
  currency char(3) not null,
  method text not null check (method in ('cash', 'bank_transfer', 'card', 'other')),
  paid_at timestamptz not null default now(),
  reference text,
  idempotency_key text,
  created_by text,
  voided_at timestamptz,
  created_at timestamptz not null default now(),
  check ((sale_id is not null) <> (purchase_id is not null)),
  foreign key (business_id, sale_id) references sales(business_id, id),
  foreign key (business_id, purchase_id) references purchases(business_id, id)
);
create unique index if not exists payments_idem_uq on payments(business_id, idempotency_key) where idempotency_key is not null;
create index if not exists payments_sale_idx on payments(business_id, sale_id);
create index if not exists payments_purchase_idx on payments(business_id, purchase_id);

create table if not exists expense_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  unique (business_id, id),
  unique (business_id, name)
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  category_id uuid,
  description text not null,
  amount numeric(14,2) not null check (amount > 0),
  currency char(3) not null,
  expense_date date not null,
  payment_method text not null check (payment_method in ('cash', 'bank_transfer', 'card', 'other')),
  notes text,
  source text not null default 'manual' check (source in ('manual', 'voice', 'ocr', 'summary', 'import')),
  idempotency_key text,
  created_by text,
  voided_at timestamptz,
  void_reason text,
  created_at timestamptz not null default now(),
  unique (business_id, id),
  foreign key (business_id, category_id) references expense_categories(business_id, id) on delete set null (category_id)
);
create unique index if not exists expenses_idem_uq on expenses(business_id, idempotency_key) where idempotency_key is not null;
create index if not exists expenses_biz_date_idx on expenses(business_id, expense_date desc);

-- The inventory ledger. Stock and stock value are always derived from these rows.
create table if not exists inventory_movements (
  id bigserial primary key,
  business_id uuid not null references businesses(id) on delete cascade,
  product_id uuid not null,
  location_id uuid not null,
  kind text not null check (kind in ('opening', 'purchase', 'sale', 'return_in', 'return_out', 'damage', 'adjustment', 'transfer_in', 'transfer_out', 'reversal')),
  quantity_delta numeric(14,3) not null check (quantity_delta <> 0),
  unit_cost numeric(18,6) not null default 0,
  value_delta numeric(18,4) not null default 0,
  ref_type text,
  ref_id uuid,
  reason text,
  reverses_id bigint references inventory_movements(id),
  occurred_at timestamptz not null default now(),
  created_by text,
  created_at timestamptz not null default now(),
  foreign key (business_id, product_id) references products(business_id, id),
  foreign key (business_id, location_id) references stock_locations(business_id, id)
);
create index if not exists inv_mov_product_idx on inventory_movements(business_id, product_id, occurred_at);
create index if not exists inv_mov_ref_idx on inventory_movements(ref_type, ref_id);

create or replace view stock_levels as
  select business_id, product_id, location_id,
         sum(quantity_delta) as quantity, sum(value_delta) as value
    from inventory_movements
   group by business_id, product_id, location_id;

create table if not exists audit_log (
  id bigserial primary key,
  business_id uuid not null references businesses(id) on delete cascade,
  user_id text,
  entity text not null,
  entity_id text,
  action text not null,
  before jsonb,
  after jsonb,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists audit_biz_idx on audit_log(business_id, created_at desc);
create index if not exists audit_entity_idx on audit_log(business_id, entity, entity_id);

-- History is append-only. Corrections are new rows (reversals, adjustments), never edits.
create or replace function operly_block_history_change() returns trigger as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'operly: % is append-only and cannot be updated', tg_table_name using errcode = 'P0001';
  end if;
  if tg_op = 'DELETE' and coalesce(current_setting('operly.allow_delete', true), '') <> 'on' then
    raise exception 'operly: % is append-only and cannot be deleted', tg_table_name using errcode = 'P0001';
  end if;
  return old;
end;
$$ language plpgsql;

drop trigger if exists inventory_movements_immutable on inventory_movements;
create trigger inventory_movements_immutable before update or delete on inventory_movements
  for each row execute function operly_block_history_change();

drop trigger if exists audit_log_immutable on audit_log;
create trigger audit_log_immutable before update or delete on audit_log
  for each row execute function operly_block_history_change();
