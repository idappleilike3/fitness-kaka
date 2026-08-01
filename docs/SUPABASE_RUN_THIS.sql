-- 【請照這 4 步操作】
-- 1. 打開 Supabase 專案 → 左側選 SQL Editor（SQL 編輯器）
-- 2. 點 New query（新增查詢）
-- 3. 把本檔「下面全部內容」複製貼上（含這段註解下方的所有 SQL）
-- 4. 點右下角 Run（執行），成功後即可關閉

-- 健身卡卡教練 Phase 1 schema
-- Asia/Taipei business dates handled in app layer

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 1. plans
CREATE TABLE public.plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  price_twd integer NOT NULL DEFAULT 0,
  duration_days integer NOT NULL DEFAULT 0,
  daily_image_quota integer NOT NULL,
  daily_text_quota integer NOT NULL,
  daily_voice_quota integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX plans_is_active_idx ON public.plans (is_active);
CREATE TRIGGER plans_set_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.plans (
  id, name, price_twd, duration_days,
  daily_image_quota, daily_text_quota, daily_voice_quota, is_active
) VALUES
  ('free', '免費體驗', 0, 0, 5, 5, 0, true),
  ('plan_399', '卡卡 Plus', 399, 30, 10, 30, 5, true),
  ('plan_799', '卡卡 Pro 教練', 799, 30, 25, 60, 15, true),
  ('plan_3590', '卡卡 Plus（年繳）', 3590, 365, 10, 30, 5, true),
  ('plan_7190', '卡卡 Pro 教練（年繳）', 7190, 365, 25, 60, 15, true);

-- 2. members
CREATE TABLE public.members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id text NOT NULL UNIQUE,
  display_name text,
  status text NOT NULL DEFAULT 'active',
  consent_at timestamptz,
  onboarding_step text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX members_status_idx ON public.members (status);
CREATE TRIGGER members_set_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. member_profiles
CREATE TABLE public.member_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL UNIQUE REFERENCES public.members (id) ON DELETE CASCADE,
  sex text,
  age integer,
  height_cm numeric(5, 1),
  weight_kg numeric(5, 1),
  target_weight_kg numeric(5, 1),
  activity_level text,
  workout_frequency integer,
  goal_type text,
  bmi numeric(5, 2),
  bmr numeric(8, 2),
  tdee numeric(8, 2),
  calorie_target integer,
  protein_g_target integer,
  carb_g_target integer,
  fat_g_target integer,
  profile_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER member_profiles_set_updated_at
  BEFORE UPDATE ON public.member_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- payment_orders before subscriptions.source_order_id FK
CREATE TABLE public.payment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_order_no text NOT NULL UNIQUE,
  member_id uuid NOT NULL REFERENCES public.members (id),
  plan_id text NOT NULL REFERENCES public.plans (id),
  amount_twd integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  newebpay_trade_no text,
  raw_return_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payment_orders_member_created_idx
  ON public.payment_orders (member_id, created_at DESC);
CREATE INDEX payment_orders_status_idx ON public.payment_orders (status);
CREATE TRIGGER payment_orders_set_updated_at
  BEFORE UPDATE ON public.payment_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. subscriptions
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members (id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES public.plans (id),
  status text NOT NULL DEFAULT 'active',
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  source_order_id uuid REFERENCES public.payment_orders (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX subscriptions_member_status_idx
  ON public.subscriptions (member_id, status);
CREATE INDEX subscriptions_expires_at_idx ON public.subscriptions (expires_at);
CREATE TRIGGER subscriptions_set_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.payment_callbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_order_id uuid REFERENCES public.payment_orders (id),
  merchant_order_no text NOT NULL,
  callback_type text NOT NULL,
  verify_ok boolean NOT NULL DEFAULT false,
  is_duplicate boolean NOT NULL DEFAULT false,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payment_callbacks_order_type_idx
  ON public.payment_callbacks (merchant_order_no, callback_type, created_at);

CREATE TABLE public.pending_meal_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members (id) ON DELETE CASCADE,
  source text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  input_text text,
  image_hash text,
  result_json jsonb NOT NULL,
  total_kcal integer,
  protein_g numeric(8, 2),
  carb_g numeric(8, 2),
  fat_g numeric(8, 2),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pending_meals_member_status_idx
  ON public.pending_meal_analyses (member_id, status, created_at DESC);
CREATE INDEX pending_meals_image_hash_idx
  ON public.pending_meal_analyses (image_hash);
CREATE TRIGGER pending_meal_analyses_set_updated_at
  BEFORE UPDATE ON public.pending_meal_analyses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.meal_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members (id) ON DELETE CASCADE,
  pending_id uuid REFERENCES public.pending_meal_analyses (id),
  meal_type text NOT NULL DEFAULT 'other',
  recorded_on date NOT NULL,
  total_kcal integer NOT NULL DEFAULT 0,
  protein_g numeric(8, 2) NOT NULL DEFAULT 0,
  carb_g numeric(8, 2) NOT NULL DEFAULT 0,
  fat_g numeric(8, 2) NOT NULL DEFAULT 0,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX meal_records_member_date_idx
  ON public.meal_records (member_id, recorded_on);
CREATE TRIGGER meal_records_set_updated_at
  BEFORE UPDATE ON public.meal_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.meal_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_record_id uuid NOT NULL REFERENCES public.meal_records (id) ON DELETE CASCADE,
  name text NOT NULL,
  portion_text text,
  kcal integer NOT NULL DEFAULT 0,
  protein_g numeric(8, 2) NOT NULL DEFAULT 0,
  carb_g numeric(8, 2) NOT NULL DEFAULT 0,
  fat_g numeric(8, 2) NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX meal_items_record_idx ON public.meal_items (meal_record_id);

CREATE TABLE public.daily_nutrition_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members (id) ON DELETE CASCADE,
  summary_date date NOT NULL,
  total_kcal integer NOT NULL DEFAULT 0,
  protein_g numeric(8, 2) NOT NULL DEFAULT 0,
  carb_g numeric(8, 2) NOT NULL DEFAULT 0,
  fat_g numeric(8, 2) NOT NULL DEFAULT 0,
  water_ml integer NOT NULL DEFAULT 0,
  exercise_kcal integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, summary_date)
);
CREATE TRIGGER daily_nutrition_summary_set_updated_at
  BEFORE UPDATE ON public.daily_nutrition_summary
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.weight_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members (id) ON DELETE CASCADE,
  recorded_on date NOT NULL,
  weight_kg numeric(5, 1) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX weight_records_member_date_idx
  ON public.weight_records (member_id, recorded_on);

-- Phase 1 reserved (no API generation yet)
CREATE TABLE public.workout_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members (id) ON DELETE CASCADE,
  title text NOT NULL,
  plan_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  week_start date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER workout_plans_set_updated_at
  BEFORE UPDATE ON public.workout_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.workout_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members (id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.workout_plans (id),
  logged_on date NOT NULL,
  exercises_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.usage_quotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members (id) ON DELETE CASCADE,
  quota_date date NOT NULL,
  image_used integer NOT NULL DEFAULT 0,
  text_used integer NOT NULL DEFAULT 0,
  voice_used integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, quota_date)
);
CREATE TRIGGER usage_quotas_set_updated_at
  BEFORE UPDATE ON public.usage_quotas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.api_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES public.members (id),
  provider text NOT NULL DEFAULT 'openai',
  model text NOT NULL,
  purpose text NOT NULL,
  prompt_tokens integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  est_cost_usd numeric(10, 6),
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX api_usage_logs_member_created_idx
  ON public.api_usage_logs (member_id, created_at DESC);
CREATE INDEX api_usage_logs_purpose_created_idx
  ON public.api_usage_logs (purpose, created_at);

CREATE TABLE public.line_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL UNIQUE,
  member_id uuid REFERENCES public.members (id),
  event_type text NOT NULL,
  payload_summary jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text NOT NULL DEFAULT 'info',
  source text NOT NULL,
  message text NOT NULL,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX system_logs_level_created_idx
  ON public.system_logs (level, created_at DESC);
