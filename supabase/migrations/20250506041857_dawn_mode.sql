/*
  # Add user topics table for persistence

  1. New Tables
    - `user_topics`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `subject` (text)
      - `topics` (jsonb)
      - `last_updated` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS user_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  topics jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, subject)
);

-- Enable RLS
ALTER TABLE user_topics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own topics"
  ON user_topics
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own topics"
  ON user_topics
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own topics"
  ON user_topics
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);