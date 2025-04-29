/*
  # Fix RLS policies for user registration

  1. Changes
    - Drop existing INSERT policies on users table
    - Create new INSERT policy that allows registration for public users
    - Ensure policy checks that the new user's ID matches their auth.uid()
    
  2. Security
    - Maintains existing RLS enabled status
    - Ensures users can only register with their own auth ID
    - Preserves existing SELECT and UPDATE policies
*/

-- Drop existing INSERT policies
DROP POLICY IF EXISTS "Enable user registration" ON users;
DROP POLICY IF EXISTS "Users can insert own data during registration" ON users;

-- Create new INSERT policy for registration
CREATE POLICY "Enable user registration" ON users
FOR INSERT
TO public
WITH CHECK (
  -- Ensure the ID matches the authenticated user's ID
  auth.uid() = id
  -- Ensure email matches the authenticated user's email
  AND email = auth.email()
);