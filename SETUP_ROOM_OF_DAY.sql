-- Create app_config table for Room of the Day cycle tracking
CREATE TABLE IF NOT EXISTS app_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner text NOT NULL DEFAULT 'user',

  -- Cycle tracking
  room_cycle text[] NOT NULL DEFAULT '{}',
  cycle_pointer int NOT NULL DEFAULT 0,
  cycle_last_advanced_date text NOT NULL,

  -- Daily override
  display_override_date text,
  display_override_room text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS if needed
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Create policy for anonymous access (single user setup)
CREATE POLICY "Allow anonymous access to app_config" ON app_config
  FOR ALL USING (true);

-- Initialize with empty config for the user
INSERT INTO app_config (owner, cycle_last_advanced_date)
VALUES ('user', date_trunc('day', now())::text)
ON CONFLICT DO NOTHING;
