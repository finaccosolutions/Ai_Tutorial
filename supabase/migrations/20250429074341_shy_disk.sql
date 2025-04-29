/*
  # Fix users table RLS policies

  1. Changes
    - Drop existing RLS policies for users table
    - Add new policies that properly handle user registration and profile management
    
  2. Security
    - Enable RLS on users table (already enabled)
    - Add policies for:
      - User registration (INSERT)
      - Reading own profile (SELECT)
      - Updating own profile (UPDATE)
    - Ensure users can only access their own data
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON users;
DROP POLICY IF EXISTS "Users can insert own data during registration" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

-- Create new policies
CREATE POLICY "Allow user registration"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id AND 
    auth.email() = email
  );

CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);