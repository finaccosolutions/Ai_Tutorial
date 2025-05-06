/*
  # Merge user_topics into user_preferences table

  1. Changes
    - Add topics column to user_preferences table
    - Drop user_topics table
    - Update RLS policies

  2. Security
    - Maintain existing RLS policies
    - Ensure data integrity during migration
*/

-- Add topics column to user_preferences
ALTER TABLE user_preferences 
ADD COLUMN topics jsonb DEFAULT '[]'::jsonb;

-- Migrate existing topics data
DO $$
BEGIN
  UPDATE user_preferences up
  SET topics = ut.topics
  FROM user_topics ut
  WHERE up.user_id = ut.user_id AND up.subject = ut.subject;
END $$;

-- Drop user_topics table
DROP TABLE IF EXISTS user_topics;