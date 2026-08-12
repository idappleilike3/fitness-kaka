create table if not exists public.line_followup_settings (
  member_id uuid primary key references public.members (id) on delete cascade,
  meal_slots text[] not null default array['breakfast']::text[],
  timezone text not null default 'Asia/Taipei',
  paused boolean not null default false,
  unanswered_count integer not null default 0 check (unanswered_count between 0 and 3),
  last_member_message_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint line_followup_meal_slots_valid check (
    meal_slots <@ array['breakfast','lunch','dinner']::text[]
  )
);

create table if not exists public.line_followup_deliveries (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  meal_slot text not null check (meal_slot in ('breakfast','lunch','dinner')),
  local_date date not null,
  status text not null default 'sent' check (status in ('sent','failed')),
  error_message text,
  created_at timestamptz not null default now(),
  unique (member_id, meal_slot, local_date)
);

create index if not exists line_followup_deliveries_created_idx
  on public.line_followup_deliveries (created_at desc);

alter table public.line_followup_settings enable row level security;
alter table public.line_followup_deliveries enable row level security;

revoke all on public.line_followup_settings from anon, authenticated;
revoke all on public.line_followup_deliveries from anon, authenticated;
