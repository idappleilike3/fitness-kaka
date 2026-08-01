-- Yearly billing + rename monthly tiers (keep live quotas).
-- Plus: 圖 10／文 30／語 5；Pro: 圖 25／文 60／語 15

INSERT INTO public.plans (
  id, name, price_twd, duration_days,
  daily_image_quota, daily_text_quota, daily_voice_quota, is_active
) VALUES
  ('plan_3590', '卡卡 Plus（年繳）', 3590, 365, 10, 30, 5, true),
  ('plan_7190', '卡卡 Pro 教練（年繳）', 7190, 365, 25, 60, 15, true)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    price_twd = EXCLUDED.price_twd,
    duration_days = EXCLUDED.duration_days,
    daily_image_quota = EXCLUDED.daily_image_quota,
    daily_text_quota = EXCLUDED.daily_text_quota,
    daily_voice_quota = EXCLUDED.daily_voice_quota,
    is_active = true;

UPDATE public.plans
SET name = '卡卡 Plus',
    daily_image_quota = 10,
    daily_text_quota = 30,
    daily_voice_quota = 5,
    is_active = true
WHERE id = 'plan_399';

UPDATE public.plans
SET name = '卡卡 Pro 教練',
    daily_image_quota = 25,
    daily_text_quota = 60,
    daily_voice_quota = 15,
    is_active = true
WHERE id = 'plan_799';
