-- ==========================================
-- SAFE RLS FIX (No Recursion)
-- ==========================================

-- 1. Helper function (Bypasses RLS)
CREATE OR REPLACE FUNCTION public.check_is_mentor() 
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'mentor'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Apply safe policies to public.users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
CREATE POLICY "Users can read own profile" ON public.users 
FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Mentors can read all profiles" ON public.users;
CREATE POLICY "Mentors can read all profiles" ON public.users 
FOR SELECT USING (public.check_is_mentor());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users 
FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users 
FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
