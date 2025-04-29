/*
  # Fix user registration RLS policies

  1. Changes
    - Drop existing policies that might conflict
    - Add new policy for public user registration
    - Maintain security for authenticated users

  2. Security
    - Allow public registration without authentication
    - Authenticated users can only access their own data
    - Maintain RLS protection for other operations
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable user registration" ON users;
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "users_insert_registration" ON users;
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;

-- Create new policies with correct permissions
CREATE POLICY "users_insert_registration"
  ON users
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "users_select_own"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "users_update_own"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);