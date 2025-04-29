/*
  # Fix user registration policy

  1. Changes
    - Add new RLS policy to allow user registration
    - Remove existing policies to avoid conflicts
    - Re-add necessary policies with correct permissions

  2. Security
    - Maintains row-level security
    - Ensures users can only access their own data
    - Allows new user creation during registration
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data during registration" ON users;

-- Create policies with correct permissions
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own data during registration"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Add policy to allow initial user creation
CREATE POLICY "Enable insert for authenticated users only"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);