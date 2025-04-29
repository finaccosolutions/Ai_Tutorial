/*
  # Fix users table RLS policies

  1. Changes
    - Remove restrictive INSERT policy that required authentication
    - Add new INSERT policy that allows registration with matching auth email
    - Keep existing SELECT and UPDATE policies unchanged

  2. Security
    - Users can only register with their authenticated email
    - Maintains existing read/update restrictions
*/

-- Drop the old restrictive INSERT policy
DROP POLICY IF EXISTS "Allow user registration" ON users;

-- Create new INSERT policy that allows registration with matching auth email
CREATE POLICY "Enable user registration" ON users
FOR INSERT 
TO public
WITH CHECK (
  -- Ensure email matches the authenticated email
  email = auth.email()
);

-- Note: Existing SELECT and UPDATE policies remain unchanged
-- They already correctly restrict access to user's own data