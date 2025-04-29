/*
  # Fix users table RLS policies

  1. Changes
    - Update INSERT policy to allow new user registration
    - Keep existing SELECT and UPDATE policies

  2. Security
    - Users can only insert their own profile during registration
    - Users can only read and update their own profile
    - Email must match the authenticated user's email
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Allow user registration" ON users;

-- Create new INSERT policy that allows registration
CREATE POLICY "Allow user registration" ON users
FOR INSERT
TO authenticated
WITH CHECK (
  -- Ensure the user can only create their own profile
  auth.uid() = id
  AND
  -- Ensure email matches the authenticated user's email
  auth.email() = email
);