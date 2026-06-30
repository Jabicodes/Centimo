create schema if not exists centimo;

-- 1. Categories Table
create table centimo.categories (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    name text not null,
    icon text default '📦',
    color text default '#FF8A65',
    budget_limit decimal(12,2) default 0.00,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 2. Expenses Table
create table centimo.expenses (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    category_id uuid references centimo.categories(id) on delete set null,
    amount decimal(12,2) not null check (amount >= 0),
    description text,
    date date not null default current_date,
    is_recurring boolean default false,
    recurring_frequency text check (recurring_frequency in ('weekly','monthly','annual')),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 3. Income Table
create table centimo.income (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    source text not null,
    amount decimal(12,2) not null check (amount >= 0),
    frequency text not null check (frequency in ('once','weekly','biweekly','monthly','annual')),
    monthly_equivalent decimal(12,2) default 0.00,
    date date not null default current_date,
    notes text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 4. Wallet Table
create table centimo.wallet (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade unique not null,
    cash_on_hand decimal(12,2) default 0.00,
    cash_on_bank decimal(12,2) default 0.00,
    updated_at timestamptz default now()
);

-- 5. Wallet Transactions Table
create table centimo.wallet_transactions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    type text not null check (type in ('cash_in','cash_out','bank_in','bank_out')),
    amount decimal(12,2) not null check (amount >= 0),
    source text check (source in ('cash','bank')),
    description text,
    category text,
    date timestamptz default now()
);

-- 6. Investments Table
create table centimo.investments (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    name text not null,
    type text check (type in ('stocks','crypto','mutual_fund','real_estate','other')),
    amount_invested decimal(12,2) not null check (amount_invested >= 0),
    current_value decimal(12,2) default 0.00,
    notes text,
    date date default current_date,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 7. Savings Goals Table
create table centimo.savings_goals (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    name text not null,
    target_amount decimal(12,2) not null check (target_amount > 0),
    current_amount decimal(12,2) default 0.00,
    monthly_contribution decimal(12,2) default 0.00,
    deadline date,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 8. Income Notes Table
create table centimo.income_notes (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    content text not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Enable RLS
alter table centimo.categories enable row level security;
alter table centimo.expenses enable row level security;
alter table centimo.income enable row level security;
alter table centimo.wallet enable row level security;
alter table centimo.wallet_transactions enable row level security;
alter table centimo.investments enable row level security;
alter table centimo.savings_goals enable row level security;
alter table centimo.income_notes enable row level security;

-- RLS Policies
create policy "Categories: owner only" on centimo.categories for all using (auth.uid() = user_id);
create policy "Expenses: owner only" on centimo.expenses for all using (auth.uid() = user_id);
create policy "Income: owner only" on centimo.income for all using (auth.uid() = user_id);
create policy "Wallet: owner only" on centimo.wallet for all using (auth.uid() = user_id);
create policy "Wallet transactions: owner only" on centimo.wallet_transactions for all using (auth.uid() = user_id);
create policy "Investments: owner only" on centimo.investments for all using (auth.uid() = user_id);
create policy "Savings goals: owner only" on centimo.savings_goals for all using (auth.uid() = user_id);
create policy "Income notes: owner only" on centimo.income_notes for all using (auth.uid() = user_id);

-- Trigger: Auto-update wallet balances
create or replace function centimo.handle_wallet_transaction()
returns trigger as $$
begin
  if new.type = 'cash_in' then
    update centimo.wallet set cash_on_hand = cash_on_hand + new.amount, updated_at = now() where user_id = new.user_id;
  elsif new.type = 'cash_out' then
    update centimo.wallet set cash_on_hand = cash_on_hand - new.amount, updated_at = now() where user_id = new.user_id;
  elsif new.type = 'bank_in' then
    update centimo.wallet set cash_on_bank = cash_on_bank + new.amount, updated_at = now() where user_id = new.user_id;
  elsif new.type = 'bank_out' then
    update centimo.wallet set cash_on_bank = cash_on_bank - new.amount, updated_at = now() where user_id = new.user_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_wallet_transaction_inserted
  after insert on centimo.wallet_transactions
  for each row execute function centimo.handle_wallet_transaction();

-- Trigger: Centimo onboarding
create or replace function centimo.handle_centimo_user_onboarding()
returns trigger as $$
begin
  insert into centimo.wallet (user_id) values (new.id);
  insert into centimo.categories (user_id, name, icon, color) values
    (new.id, 'Food', '🍔', '#FF8A65'),
    (new.id, 'Transport', '🚗', '#4ea8de'),
    (new.id, 'Housing', '🏠', '#72efdd'),
    (new.id, 'Utilities', '⚡', '#ffd166'),
    (new.id, 'Entertainment', '🎬', '#b5179e'),
    (new.id, 'Health', '🏥', '#ff4d6d'),
    (new.id, 'Shopping', '🛍️', '#f72585'),
    (new.id, 'Education', '📚', '#4cc9f0'),
    (new.id, 'Other', '📦', '#8e8e93');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_centimo_auth_user_created
  after insert on auth.users
  for each row execute function centimo.handle_centimo_user_onboarding();
