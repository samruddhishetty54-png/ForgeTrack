-- ====================================================================
-- FORGETRACK DATABASE REPAIR SCRIPT
-- Run this script in your Supabase SQL Editor to fix login and data issues.
-- ====================================================================

-- 1. FIX: Ensure all authenticated users have a profile in public.users
-- This syncs anyone who signed up via the Supabase Auth UI as a 'mentor'.
INSERT INTO public.users (id, email, role, display_name)
SELECT 
    id, 
    email, 
    'mentor' as role, 
    split_part(email, '@', 1) as display_name
FROM auth.users
WHERE email NOT LIKE '%@forge.local'
ON CONFLICT (id) DO NOTHING;

-- 2. FIX: Allow the frontend to auto-repair profiles in the future
-- This adds an RLS policy so the app can create the profile if it's missing
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
CREATE POLICY "Users can insert their own profile" 
ON public.users 
FOR INSERT 
TO authenticated 
WITH CHECK (id = auth.uid());

-- 3. FIX: Ensure mentors can read all students (fixing data not fetching)
-- Just to be safe, ensuring the mentors have full read access
DROP POLICY IF EXISTS "Mentors can read all students" ON public.students;
CREATE POLICY "Mentors can read all students" 
ON public.students 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'mentor')
);

-- Note: If your dashboard still shows 0 Sessions and 0 Students after this,
-- you must run the original `seed.sql` script to populate the dummy data!
