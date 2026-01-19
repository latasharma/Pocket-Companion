-- News items captured from RSS for proactive summaries

CREATE TABLE IF NOT EXISTS public.news_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  link TEXT,
  source TEXT,
  published_at TIMESTAMPTZ,
  keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, link)
);

CREATE INDEX IF NOT EXISTS idx_news_items_user_id ON public.news_items(user_id);
CREATE INDEX IF NOT EXISTS idx_news_items_published_at ON public.news_items(published_at);

ALTER TABLE public.news_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their news items" ON public.news_items;
DROP POLICY IF EXISTS "Users can insert their news items" ON public.news_items;

CREATE POLICY "Users can view their news items"
  ON public.news_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their news items"
  ON public.news_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);
