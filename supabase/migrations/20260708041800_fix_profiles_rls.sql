-- Drop existing partner profiles policy
DROP POLICY IF EXISTS "Users can view partner profiles" ON public.profiles;

-- Create simplified partner profiles policy using the existing security definer function
CREATE POLICY "Users can view partner profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.relationship_members
      WHERE profile_id = profiles.id 
      AND public.is_relationship_member(relationship_id)
    )
  );
