-- Production migration: free image and text meal analyses share five uses per day.
UPDATE public.plans
SET
  name = '免費體驗',
  daily_image_quota = 5,
  daily_text_quota = 5,
  daily_voice_quota = 0,
  updated_at = now()
WHERE id = 'free';
