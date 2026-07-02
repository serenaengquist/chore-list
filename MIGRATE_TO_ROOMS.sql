-- Migration: Convert free-text room strings to managed rooms table with colors

-- 1. Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#FFFF00', -- Default to voltage yellow
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Add room_id column to chores (nullable initially)
ALTER TABLE chores ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES rooms(id) ON DELETE SET NULL;

-- 3. Create rooms from existing distinct room strings
INSERT INTO rooms (name, color)
SELECT DISTINCT room, '#FFFF00'
FROM chores
WHERE room IS NOT NULL AND room != ''
ON CONFLICT (name) DO NOTHING;

-- 4. Backfill room_id from room string
UPDATE chores
SET room_id = rooms.id
FROM rooms
WHERE chores.room = rooms.name AND chores.room_id IS NULL;

-- 5. Keep room column for now (safe to drop later if needed)
-- Migration complete - rooms are now properly linked by ID

-- Enable RLS on rooms table
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous access to rooms" ON rooms
  FOR ALL USING (true);
