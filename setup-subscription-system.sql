-- Add subscription fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'pro')),
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'expired', 'trial')),
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_renewal_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE;

-- Create subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'premium', 'pro')),
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  features JSONB NOT NULL DEFAULT '{}',
  max_ai_messages INTEGER DEFAULT 10,
  max_voice_messages INTEGER DEFAULT 5,
  connect_enabled BOOLEAN DEFAULT false,
  priority_support BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, tier, price_monthly, price_yearly, features, max_ai_messages, max_voice_messages, connect_enabled, priority_support) VALUES
('Free', 'free', 0.00, 0.00, '{"ai_chat": true, "voice_chat": true, "basic_memory": true}', 10, 5, false, false),
('Premium', 'premium', 9.99, 99.99, '{"ai_chat": true, "voice_chat": true, "advanced_memory": true, "connect": true, "unlimited_messages": true}', -1, -1, true, false),
('Pro', 'pro', 19.99, 199.99, '{"ai_chat": true, "voice_chat": true, "advanced_memory": true, "connect": true, "unlimited_messages": true, "priority_support": true, "analytics": true}', -1, -1, true, true)
ON CONFLICT (name) DO NOTHING;

-- Create subscription history table
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id),
  action TEXT NOT NULL CHECK (action IN ('started', 'upgraded', 'downgraded', 'cancelled', 'renewed', 'expired')),
  previous_plan_id UUID REFERENCES subscription_plans(id),
  amount_paid DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  payment_method TEXT,
  transaction_id TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create function to check if user has Connect access
CREATE OR REPLACE FUNCTION has_connect_access(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_tier TEXT;
  user_status TEXT;
  user_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get user's subscription details
  SELECT subscription_tier, subscription_status, subscription_end_date
  INTO user_tier, user_status, user_end_date
  FROM profiles
  WHERE id = user_id;
  
  -- Check if user has premium/pro subscription and is active
  IF user_tier IN ('premium', 'pro') AND user_status = 'active' THEN
    -- Check if subscription hasn't expired
    IF user_end_date IS NULL OR user_end_date > NOW() THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RLS policies for subscription data
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

-- Users can read subscription plans
CREATE POLICY "Users can read subscription plans" ON subscription_plans
FOR SELECT USING (true);

-- Users can only read their own subscription history
CREATE POLICY "Users can read their own subscription history" ON subscription_history
FOR SELECT USING (auth.uid() = user_id);

-- Only service role can insert/update subscription history
CREATE POLICY "Service role can manage subscription history" ON subscription_history
FOR ALL USING (auth.role() = 'service_role');

-- Update profiles RLS to allow users to read their own subscription info
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
CREATE POLICY "Users can read their own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id ON subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_created_at ON subscription_history(created_at);

-- Grant necessary permissions
GRANT SELECT ON subscription_plans TO authenticated;
GRANT SELECT ON subscription_history TO authenticated;
GRANT EXECUTE ON FUNCTION has_connect_access(UUID) TO authenticated;
