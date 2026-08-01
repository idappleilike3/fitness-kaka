-- G1: 30-day challenge. Business dates are supplied by the application in Asia/Taipei.

CREATE TABLE public.member_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  started_on date NOT NULL,
  ends_on date NOT NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_on = started_on + 29)
);
CREATE UNIQUE INDEX member_challenges_one_active_idx
  ON public.member_challenges (member_id) WHERE status = 'active';
CREATE INDEX member_challenges_member_created_idx
  ON public.member_challenges (member_id, created_at DESC);
CREATE TRIGGER member_challenges_set_updated_at
  BEFORE UPDATE ON public.member_challenges
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  mission_type text NOT NULL,
  verification_rule jsonb NOT NULL DEFAULT '{}'::jsonb,
  xp_reward integer NOT NULL DEFAULT 0 CHECK (xp_reward >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER missions_set_updated_at
  BEFORE UPDATE ON public.missions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.missions (
  code, title, description, mission_type, verification_rule, xp_reward
) VALUES (
  'record_one_meal',
  '確認一餐',
  '確認今天的一筆飲食紀錄',
  'meal_record',
  '{"minimum_confirmed_meals": 1}'::jsonb,
  10
) ON CONFLICT (code) DO UPDATE
SET title = EXCLUDED.title,
    description = EXCLUDED.description,
    verification_rule = EXCLUDED.verification_rule,
    xp_reward = EXCLUDED.xp_reward,
    is_active = true;

CREATE TABLE public.mission_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members (id) ON DELETE CASCADE,
  mission_id uuid NOT NULL REFERENCES public.missions (id),
  challenge_day integer NOT NULL CHECK (challenge_day BETWEEN 1 AND 30),
  assigned_on date NOT NULL,
  status text NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned', 'completed', 'skipped', 'expired')),
  progress_value numeric NOT NULL DEFAULT 0,
  target_value numeric NOT NULL DEFAULT 1,
  completed_at timestamptz,
  evidence_type text,
  evidence_id uuid REFERENCES public.meal_records (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, mission_id, assigned_on)
);
CREATE INDEX mission_progress_member_day_idx
  ON public.mission_progress (member_id, assigned_on);
CREATE TRIGGER mission_progress_set_updated_at
  BEFORE UPDATE ON public.mission_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.user_levels (
  member_id uuid PRIMARY KEY REFERENCES public.members (id) ON DELETE CASCADE,
  level_code text NOT NULL DEFAULT 'starter',
  total_xp integer NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
  current_streak_days integer NOT NULL DEFAULT 0 CHECK (current_streak_days >= 0),
  longest_streak_days integer NOT NULL DEFAULT 0 CHECK (longest_streak_days >= 0),
  challenge_started_on date,
  challenge_day integer NOT NULL DEFAULT 0 CHECK (challenge_day BETWEEN 0 AND 30),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER user_levels_set_updated_at
  BEFORE UPDATE ON public.user_levels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.record_challenge_meal(
  p_member_id uuid,
  p_meal_id uuid,
  p_recorded_on date
) RETURNS TABLE (
  challenge_day integer,
  mission_completed boolean,
  current_streak_days integer,
  health_event_xp integer
) LANGUAGE plpgsql AS $$
DECLARE
  v_challenge public.member_challenges%ROWTYPE;
  v_mission_id uuid;
  v_xp integer;
  v_progress_id uuid;
  v_last_completed date;
  v_streak integer;
BEGIN
  SELECT * INTO v_challenge
  FROM public.member_challenges
  WHERE member_id = p_member_id AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    BEGIN
      INSERT INTO public.member_challenges (member_id, started_on, ends_on)
      VALUES (p_member_id, p_recorded_on, p_recorded_on + 29)
      RETURNING * INTO v_challenge;
    EXCEPTION WHEN unique_violation THEN
      SELECT * INTO v_challenge
      FROM public.member_challenges
      WHERE member_id = p_member_id AND status = 'active'
      FOR UPDATE;
    END;
  END IF;

  IF p_recorded_on < v_challenge.started_on OR p_recorded_on > v_challenge.ends_on THEN
    RETURN QUERY SELECT 0, false, 0, 0;
    RETURN;
  END IF;

  SELECT id, xp_reward INTO v_mission_id, v_xp
  FROM public.missions WHERE code = 'record_one_meal' AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'record_one_meal mission missing'; END IF;

  INSERT INTO public.mission_progress (
    member_id, mission_id, challenge_day, assigned_on, status, progress_value,
    target_value, completed_at, evidence_type, evidence_id
  ) VALUES (
    p_member_id, v_mission_id, (p_recorded_on - v_challenge.started_on) + 1,
    p_recorded_on, 'completed', 1, 1, now(), 'meal_record', p_meal_id
  )
  ON CONFLICT (member_id, mission_id, assigned_on) DO NOTHING
  RETURNING id INTO v_progress_id;

  INSERT INTO public.user_levels (member_id, challenge_started_on, challenge_day)
  VALUES (p_member_id, v_challenge.started_on, (p_recorded_on - v_challenge.started_on) + 1)
  ON CONFLICT (member_id) DO NOTHING;

  IF v_progress_id IS NULL THEN
    SELECT current_streak_days INTO v_streak FROM public.user_levels WHERE member_id = p_member_id;
    RETURN QUERY SELECT (p_recorded_on - v_challenge.started_on) + 1, false, v_streak, 0;
    RETURN;
  END IF;

  SELECT max(assigned_on) INTO v_last_completed
  FROM public.mission_progress
  WHERE member_id = p_member_id
    AND status = 'completed'
    AND assigned_on < p_recorded_on;

  v_streak := CASE WHEN v_last_completed = p_recorded_on - 1
    THEN (SELECT current_streak_days FROM public.user_levels WHERE member_id = p_member_id) + 1
    ELSE 1 END;

  UPDATE public.user_levels
  SET total_xp = total_xp + v_xp,
      current_streak_days = v_streak,
      longest_streak_days = greatest(longest_streak_days, v_streak),
      challenge_started_on = v_challenge.started_on,
      challenge_day = (p_recorded_on - v_challenge.started_on) + 1
  WHERE member_id = p_member_id;

  RETURN QUERY SELECT (p_recorded_on - v_challenge.started_on) + 1, true, v_streak, v_xp;
END;
$$;
