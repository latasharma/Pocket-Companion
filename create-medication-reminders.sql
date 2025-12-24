-- Create medication_reminders table to match client payload
-- Run this in Supabase SQL editor or psql connected to your database.

create extension if not exists pgcrypto;

-- Ensure helper function exists (other migration files may already define this)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Primary table creation (safe to run)
-- Note: reminder_time is nullable because the client saves draft records without a resolved time.
CREATE TABLE IF NOT EXISTS medication_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Core fields expected by the client
  title VARCHAR(200) NOT NULL,
  description TEXT,
  reminder_time TIMESTAMPTZ,
  category VARCHAR(50) NOT NULL DEFAULT 'other' CHECK (category IN ('important_dates','medications','appointments','other')),

  -- Notification / scheduling
  notification_types TEXT[] DEFAULT ARRAY['push']::TEXT[] CHECK (notification_types <@ ARRAY['push','voice','email','in_app']::TEXT[]),
  notify_before_minutes INTEGER DEFAULT 0,

  -- Arbitrary metadata blob used heavily by the client
  metadata JSONB DEFAULT '{}'::JSONB,

  -- Recurrence
  repeat_frequency VARCHAR(20) DEFAULT 'none' CHECK (repeat_frequency IN ('none','daily','weekly','monthly','yearly','custom')),
  frequency_type VARCHAR(20),
  routine_anchor TEXT,

  -- Status and soft-delete
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','draft','completed','snoozed','missed','cancelled')),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safety: If the table already existed without some of the expected columns (for example an older schema),
-- provide safe ALTER statements to add those columns and constraints so clients that insert fields like
-- `category` or `metadata` don't hit "Could not find the 'category' column" errors in Supabase.
-- ALTER TABLE ... ADD COLUMN IF NOT EXISTS is a no-op when the column already exists.

-- Add missing columns if they don't exist (safe to run multiple times)
ALTER TABLE medication_reminders ADD COLUMN IF NOT EXISTS reminder_time TIMESTAMPTZ;
ALTER TABLE medication_reminders ADD COLUMN IF NOT EXISTS category VARCHAR(50) NOT NULL DEFAULT 'other';
ALTER TABLE medication_reminders ADD COLUMN IF NOT EXISTS notification_types TEXT[] DEFAULT ARRAY['push']::TEXT[];
ALTER TABLE medication_reminders ADD COLUMN IF NOT EXISTS notify_before_minutes INTEGER DEFAULT 0;
ALTER TABLE medication_reminders ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::JSONB;
ALTER TABLE medication_reminders ADD COLUMN IF NOT EXISTS repeat_frequency VARCHAR(20) DEFAULT 'none';
ALTER TABLE medication_reminders ADD COLUMN IF NOT EXISTS frequency_type VARCHAR(20);
ALTER TABLE medication_reminders ADD COLUMN IF NOT EXISTS routine_anchor TEXT;
ALTER TABLE medication_reminders ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE medication_reminders ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE medication_reminders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE medication_reminders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE medication_reminders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add check constraints only if they are not already present (use pg_constraint lookup)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_medication_reminders_category'
  ) THEN
    ALTER TABLE medication_reminders ADD CONSTRAINT chk_medication_reminders_category CHECK (category IN ('important_dates','medications','appointments','other'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_med_reminder_notification_types'
  ) THEN
    ALTER TABLE medication_reminders ADD CONSTRAINT chk_med_reminder_notification_types CHECK (notification_types <@ ARRAY['push','voice','email','in_app']::TEXT[]);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_medication_reminders_repeat_frequency'
  ) THEN
    ALTER TABLE medication_reminders ADD CONSTRAINT chk_medication_reminders_repeat_frequency CHECK (repeat_frequency IN ('none','daily','weekly','monthly','yearly','custom'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_medication_reminders_status'
  ) THEN
    ALTER TABLE medication_reminders ADD CONSTRAINT chk_medication_reminders_status CHECK (status IN ('pending','draft','completed','snoozed','missed','cancelled'));
  END IF;
END$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_medication_reminders_user_id ON medication_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_medication_reminders_reminder_time ON medication_reminders(reminder_time);

-- Enable RLS and policies similar to other tables
ALTER TABLE medication_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "MedicationReminders: users can select own" ON medication_reminders
  FOR SELECT USING (auth.uid() = user_id AND is_deleted = FALSE);

CREATE POLICY IF NOT EXISTS "MedicationReminders: users can insert own" ON medication_reminders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "MedicationReminders: users can update own" ON medication_reminders
  FOR UPDATE USING (auth.uid() = user_id);

-- Ensure trigger exists (CREATE TRIGGER will error if exists; check before creating)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_medication_reminders_updated_at'
  ) THEN
    CREATE TRIGGER update_medication_reminders_updated_at
      BEFORE UPDATE ON medication_reminders
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END$$;

-- Notes:
-- 1) The client expects to insert JSON-compatible values for `metadata` and arrays for `notification_types`.
-- 2) Run this migration in your Supabase SQL editor. If a table named medication_reminders already exists with
--    a conflicting schema, adjust the migration (ALTER TABLE) or migrate data as appropriate.
-- 3) After running, clear the Supabase schema cache (reconnect the client, re-run your app or visit the table editor)
--    in the Supabase console so the client picks up the new columns. Supabase client-side schema caching is often the
--    cause of "Could not find the 'category' column" errors even after the DB has been altered.
-- 4) If your app still receives the error after applying these changes, confirm you're connected to the correct
--    Supabase project and schema (public). You can also verify by querying information_schema.columns for
--    medication_reminders from psql or Supabase SQL editor.
