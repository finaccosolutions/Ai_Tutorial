/*
  # Add presentation cache table

  1. New Tables
    - `presentation_cache`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `topic_id` (text)
      - `presentation_data` (jsonb)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS presentation_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  topic_id text NOT NULL,
  presentation_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, topic_id)
);

-- Enable RLS
ALTER TABLE presentation_cache ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own presentation cache"
  ON presentation_cache
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own presentation cache"
  ON presentation_cache
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own presentation cache"
  ON presentation_cache
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger for updating updated_at
CREATE TRIGGER update_presentation_cache_updated_at
  BEFORE UPDATE ON presentation_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();