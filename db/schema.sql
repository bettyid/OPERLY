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
