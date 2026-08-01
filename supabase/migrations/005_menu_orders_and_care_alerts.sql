-- Commercial phase 1: one-time seven-day menu orders and administrator care center.
INSERT INTO public.plans (id, name, price_twd, duration_days, image_daily_limit, text_daily_limit, voice_daily_limit, features, is_active)
VALUES ('plan_299', '7 天個人化減脂菜單', 299, 0, 0, 0, 0,
  '{"kind":"one_time","menu_days":7,"regeneration_limit":1}'::jsonb, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price_twd = EXCLUDED.price_twd,
  features = EXCLUDED.features, is_active = true;

CREATE TABLE IF NOT EXISTS public.menu_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  payment_order_id uuid REFERENCES public.payment_orders(id),
  status text NOT NULL DEFAULT 'awaiting_profile' CHECK (status IN (
    'awaiting_profile','questionnaire','generating','ready','revision_requested','completed','refunded'
  )),
  questionnaire jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_menu jsonb,
  revision_count integer NOT NULL DEFAULT 0 CHECK (revision_count >= 0),
  generated_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS menu_orders_member_created_idx ON public.menu_orders(member_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.care_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low','medium','high')),
  reason text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  member_reply text,
  admin_recommendation text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','resolved','dismissed')),
  notified_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS care_alerts_status_created_idx ON public.care_alerts(status, created_at DESC);

-- Adaptive sales discovery: store needs, consent and recommendation history.
CREATE TABLE IF NOT EXISTS public.member_sales_profiles (
  member_id uuid PRIMARY KEY REFERENCES public.members(id) ON DELETE CASCADE,
  menu_need_score integer NOT NULL DEFAULT 0,
  accountability_need_score integer NOT NULL DEFAULT 0,
  challenge_need_score integer NOT NULL DEFAULT 0,
  purchase_intent_score integer NOT NULL DEFAULT 0,
  price_sensitive boolean NOT NULL DEFAULT false,
  sales_paused_until timestamptz,
  tags text[] NOT NULL DEFAULT '{}',
  last_recommended_plan text,
  last_recommended_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Keep adaptive sales recommendations respectful and non-repetitive.
ALTER TABLE public.member_sales_profiles
  ADD COLUMN IF NOT EXISTS last_discovery_question text,
  ADD COLUMN IF NOT EXISTS last_discovery_at timestamptz;
CREATE INDEX IF NOT EXISTS member_sales_profiles_recommendation_idx
  ON public.member_sales_profiles(last_recommended_at DESC);

-- Sales CRM: conversation timeline, opportunity stage and gentle follow-up tasks.
CREATE TABLE IF NOT EXISTS public.member_conversation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('member','assistant','admin')),
  channel text NOT NULL DEFAULT 'line',
  event_type text NOT NULL DEFAULT 'text',
  content text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS member_conversation_events_member_created_idx
  ON public.member_conversation_events(member_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.member_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  opportunity_score integer NOT NULL DEFAULT 0 CHECK (opportunity_score BETWEEN 0 AND 100),
  opportunity_stage text NOT NULL DEFAULT 'discovering' CHECK (opportunity_stage IN (
    'discovering','warming','qualified','considering','ready','won','paused','lost'
  )),
  need_summary text,
  recommended_next_step text,
  suggested_message text,
  due_at timestamptz,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','snoozed','done','cancelled')),
  last_contact_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS member_followups_status_due_idx
  ON public.member_followups(status, due_at);
CREATE UNIQUE INDEX IF NOT EXISTS member_followups_member_unique_idx ON public.member_followups(member_id);

-- Automated companionship delivery history and operational errors.
CREATE TABLE IF NOT EXISTS public.member_automation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  event_key text NOT NULL,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(member_id, event_key)
);
CREATE INDEX IF NOT EXISTS member_automation_events_created_idx ON public.member_automation_events(created_at DESC);

CREATE TABLE IF NOT EXISTS public.system_error_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low','medium','high')),
  error_message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS system_error_events_open_idx ON public.system_error_events(created_at DESC) WHERE resolved_at IS NULL;


-- Prevent duplicate unresolved care alerts for the same member and signal.
ALTER TABLE public.care_alerts
  ADD COLUMN IF NOT EXISTS dedupe_key text;
CREATE UNIQUE INDEX IF NOT EXISTS care_alerts_open_dedupe_idx
  ON public.care_alerts(member_id, alert_type, dedupe_key)
  WHERE status IN ('pending','in_progress');
