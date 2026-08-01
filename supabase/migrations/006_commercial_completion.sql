-- Fitness Kaka v10 commercial completion: auditable admin actions and challenge operations.
CREATE TABLE IF NOT EXISTS public.admin_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_action_logs_created_idx ON public.admin_action_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS public.challenge_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','completed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_on >= starts_on)
);

ALTER TABLE public.member_challenges ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.challenge_batches(id);
ALTER TABLE public.member_challenges ADD COLUMN IF NOT EXISTS needs_admin_care boolean NOT NULL DEFAULT false;
ALTER TABLE public.member_challenges ADD COLUMN IF NOT EXISTS admin_note text;
CREATE INDEX IF NOT EXISTS member_challenges_care_idx ON public.member_challenges(needs_admin_care, status);
