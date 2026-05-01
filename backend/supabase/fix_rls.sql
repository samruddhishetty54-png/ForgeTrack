-- =====================================================
-- ForgeTrack RLS FIX SCRIPT
-- Run this ENTIRE script in Supabase SQL Editor
-- This fixes all data access issues
-- =====================================================

-- STEP 1: Drop all old, conflicting RLS policies
-- =====================================================

DROP POLICY IF EXISTS "Mentors can manage students"       ON public.students;
DROP POLICY IF EXISTS "Students can read own profile"     ON public.students;
DROP POLICY IF EXISTS "Public read for student count"     ON public.students;
DROP POLICY IF EXISTS "Authenticated can read students"   ON public.students;

DROP POLICY IF EXISTS "Mentors can manage sessions"       ON public.sessions;
DROP POLICY IF EXISTS "Students can view all sessions"    ON public.sessions;
DROP POLICY IF EXISTS "Anyone can view sessions"          ON public.sessions;

DROP POLICY IF EXISTS "Mentors can manage attendance"     ON public.attendance;
DROP POLICY IF EXISTS "Students can read own attendance"  ON public.attendance;

DROP POLICY IF EXISTS "Mentors can manage materials"      ON public.materials;
DROP POLICY IF EXISTS "Students can view all materials"   ON public.materials;
DROP POLICY IF EXISTS "Anyone can view materials"         ON public.materials;

DROP POLICY IF EXISTS "Mentors can manage import logs"    ON public.import_log;

DROP POLICY IF EXISTS "Mentors can read all users"        ON public.users;
DROP POLICY IF EXISTS "Students can read own user"        ON public.users;
DROP POLICY IF EXISTS "Users can read own profile"        ON public.users;
DROP POLICY IF EXISTS "Authenticated users read own profile" ON public.users;

-- STEP 2: Recreate is_mentor helper (SECURITY DEFINER so it bypasses RLS on users table)
-- =====================================================

CREATE OR REPLACE FUNCTION is_mentor() RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'mentor'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 3: STUDENTS table policies
-- Mentors: full access (SELECT + INSERT + UPDATE + DELETE)
-- Authenticated users: can SELECT (needed for mentor dashboard counts)
-- =====================================================

CREATE POLICY "students_select_authenticated"
  ON public.students FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "students_insert_mentor"
  ON public.students FOR INSERT
  TO authenticated
  WITH CHECK (is_mentor());

CREATE POLICY "students_update_mentor"
  ON public.students FOR UPDATE
  TO authenticated
  USING (is_mentor())
  WITH CHECK (is_mentor());

CREATE POLICY "students_delete_mentor"
  ON public.students FOR DELETE
  TO authenticated
  USING (is_mentor());

-- STEP 4: SESSIONS table policies
-- Anyone authenticated can view; only mentors can write
-- =====================================================

CREATE POLICY "sessions_select_authenticated"
  ON public.sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "sessions_insert_mentor"
  ON public.sessions FOR INSERT
  TO authenticated
  WITH CHECK (is_mentor());

CREATE POLICY "sessions_update_mentor"
  ON public.sessions FOR UPDATE
  TO authenticated
  USING (is_mentor())
  WITH CHECK (is_mentor());

CREATE POLICY "sessions_delete_mentor"
  ON public.sessions FOR DELETE
  TO authenticated
  USING (is_mentor());

-- STEP 5: ATTENDANCE table policies
-- Mentors: full access to all attendance
-- Students: can only read their own attendance
-- =====================================================

CREATE POLICY "attendance_select_mentor"
  ON public.attendance FOR SELECT
  TO authenticated
  USING (is_mentor());

CREATE POLICY "attendance_select_student"
  ON public.attendance FOR SELECT
  TO authenticated
  USING (
    student_id = (
      SELECT student_id FROM public.users
      WHERE id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "attendance_insert_mentor"
  ON public.attendance FOR INSERT
  TO authenticated
  WITH CHECK (is_mentor());

CREATE POLICY "attendance_update_mentor"
  ON public.attendance FOR UPDATE
  TO authenticated
  USING (is_mentor())
  WITH CHECK (is_mentor());

CREATE POLICY "attendance_delete_mentor"
  ON public.attendance FOR DELETE
  TO authenticated
  USING (is_mentor());

-- STEP 6: MATERIALS table policies
-- Anyone authenticated can view; only mentors can write
-- =====================================================

CREATE POLICY "materials_select_authenticated"
  ON public.materials FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "materials_insert_mentor"
  ON public.materials FOR INSERT
  TO authenticated
  WITH CHECK (is_mentor());

CREATE POLICY "materials_update_mentor"
  ON public.materials FOR UPDATE
  TO authenticated
  USING (is_mentor())
  WITH CHECK (is_mentor());

CREATE POLICY "materials_delete_mentor"
  ON public.materials FOR DELETE
  TO authenticated
  USING (is_mentor());

-- STEP 7: IMPORT_LOG table policies
-- Only mentors can access import logs
-- =====================================================

CREATE POLICY "import_log_mentor"
  ON public.import_log FOR ALL
  TO authenticated
  USING (is_mentor())
  WITH CHECK (is_mentor());

-- STEP 8: USERS table policies
-- Users can always read their own profile
-- Mentors can read all user profiles
-- =====================================================

CREATE POLICY "users_select_own"
  ON public.users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "users_select_mentor"
  ON public.users FOR SELECT
  TO authenticated
  USING (is_mentor());

CREATE POLICY "users_insert_system"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- STEP 9: Verify data exists - this will show counts in the Results panel
-- =====================================================

SELECT 'students'   AS table_name, COUNT(*) AS row_count FROM public.students
UNION ALL
SELECT 'sessions'   AS table_name, COUNT(*) AS row_count FROM public.sessions
UNION ALL
SELECT 'attendance' AS table_name, COUNT(*) AS row_count FROM public.attendance
UNION ALL
SELECT 'materials'  AS table_name, COUNT(*) AS row_count FROM public.materials
UNION ALL
SELECT 'users'      AS table_name, COUNT(*) AS row_count FROM public.users;
