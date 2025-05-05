/*
  # Fix user registration RLS policies

  1. Changes
    - Drop all existing policies to avoid conflicts
    - Add new policies with unique names
    - Allow public registration
    - Maintain security for authenticated users

  2. Security
    - Allow registration with email verification
    - Authenticated users can only access their own data
    - Maintain RLS protection
*/

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable user registration" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own data during registration" ON users;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON users;

-- Create new policies with unique names
CREATE POLICY "users_public_registration"
  ON users
  FOR INSERT
  TO public
  WITH CHECK (
    -- Allow registration only if email matches auth email
    auth.email() = email AND
    -- Ensure user can only create their own profile
    auth.uid() = id
  );

CREATE POLICY "users_read_own"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "users_update_own"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);