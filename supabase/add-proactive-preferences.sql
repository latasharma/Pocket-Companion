-- Proactive preferences and engagement state

CREATE TABLE IF NOT EXISTS public.proactive_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  channels TEXT[] DEFAULT ARRAY['sms']::TEXT[],
  quiet_hours_start TIME DEFAULT '21:00',
  quiet_hours_end TIME DEFAULT '08:00',
  frequency TEXT DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly')),
  timezone TEXT DEFAULT 'America/New_York',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.proactive_topics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic_type TEXT NOT NULL CHECK (topic_type IN ('news', 'games', 'important_dates', 'custom')),
  keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
  rss_sources TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.proactive_delivery_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL CHECK (message_type IN ('news', 'reminder', 'game', 'daily')),
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email', 'in_app')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::JSONB
);

CREATE TABLE IF NOT EXISTS public.proactive_game_state (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL CHECK (game_type IN ('trivia', 'word', 'memory')),
  streak INTEGER NOT NULL DEFAULT 0,
  last_played TIMESTAMPTZ,
  state JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, game_type)
);

-- Updated_at triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_proactive_preferences_updated_at') THEN
    CREATE TRIGGER update_proactive_preferences_updated_at
    BEFORE UPDATE ON public.proactive_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_proactive_topics_updated_at') THEN
    CREATE TRIGGER update_proactive_topics_updated_at
    BEFORE UPDATE ON public.proactive_topics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_proactive_game_state_updated_at') THEN
    CREATE TRIGGER update_proactive_game_state_updated_at
    BEFORE UPDATE ON public.proactive_game_state
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END$$;

-- RLS
ALTER TABLE public.proactive_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proactive_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proactive_delivery_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proactive_game_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their proactive preferences"
  ON public.proactive_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their proactive preferences"
  ON public.proactive_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their proactive preferences"
  ON public.proactive_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their proactive topics"
  ON public.proactive_topics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their proactive topics"
  ON public.proactive_topics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their proactive topics"
  ON public.proactive_topics FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their proactive topics"
  ON public.proactive_topics FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their proactive delivery log"
  ON public.proactive_delivery_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their proactive delivery log"
  ON public.proactive_delivery_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their proactive game state"
  ON public.proactive_game_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their proactive game state"
  ON public.proactive_game_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their proactive game state"
  ON public.proactive_game_state FOR UPDATE
  USING (auth.uid() = user_id);
