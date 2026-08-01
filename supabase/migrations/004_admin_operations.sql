-- Owner-operated payment and subscription audit trail.
CREATE TABLE IF NOT EXISTS public.admin_operation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members (id) ON DELETE CASCADE,
  operation text NOT NULL CHECK (
    operation IN ('grant_plan', 'record_payment', 'pause', 'resume', 'extend')
  ),
  plan_id text REFERENCES public.plans (id),
  amount_twd integer CHECK (amount_twd IS NULL OR amount_twd > 0),
  note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_operation_logs_member_created_idx
  ON public.admin_operation_logs (member_id, created_at DESC);

