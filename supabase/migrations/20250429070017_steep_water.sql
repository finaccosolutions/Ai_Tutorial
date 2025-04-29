/*
  # Add insert policy for users table
  
  1. Changes
    - Add policy to allow users to insert their own data during registration
  
  2. Security
    - New policy ensures users can only insert rows where their auth.uid matches the row id
*/

-- Add insert policy for users table
CREATE POLICY "Users can insert own data during registration"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);