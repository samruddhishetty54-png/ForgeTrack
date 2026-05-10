-- ==========================================
-- ForgeTrack Database Setup Script
-- Run this in Supabase SQL Editor
-- Safe to run multiple times (idempotent)
-- ==========================================

-- Step 1: Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 2: Schema permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;

-- ==========================================
-- Step 3: Create Tables (if not exist)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.students (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    usn TEXT UNIQUE NOT NULL,
    admission_number TEXT,
    email TEXT,
    branch_code TEXT NOT NULL,
    batch TEXT DEFAULT '2024-2028',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.sessions (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    topic TEXT NOT NULL,
    month_number INTEGER NOT NULL,
    duration_hours DECIMAL(3,1) DEFAULT 2.0,
    session_type TEXT DEFAULT 'offline',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.import_log (
    id SERIAL PRIMARY KEY,
    filename TEXT NOT NULL,
    uploaded_by TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    total_rows INTEGER NOT NULL,
    imported_rows INTEGER NOT NULL,
    skipped_rows INTEGER NOT NULL,
    warnings TEXT,
    column_mapping TEXT,
    status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.attendance (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    session_id INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    present BOOLEAN NOT NULL,
    marked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    marked_by TEXT DEFAULT 'system',
    import_id INTEGER REFERENCES public.import_log(id) ON DELETE SET NULL,
    UNIQUE(student_id, session_id)
);

CREATE TABLE IF NOT EXISTS public.materials (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('mentor', 'student')),
    student_id INTEGER REFERENCES public.students(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- Step 4: Validation Constraints
-- ==========================================

CREATE OR REPLACE FUNCTION check_attendance_date()
RETURNS TRIGGER AS $$
DECLARE
    session_date DATE;
BEGIN
    SELECT date INTO session_date FROM public.sessions WHERE id = NEW.session_id;
    IF session_date > CURRENT_DATE THEN
        RAISE EXCEPTION 'Attendance date cannot be in the future';
    END IF;
    IF session_date < '2025-08-04'::DATE THEN
        RAISE EXCEPTION 'Attendance date cannot be before program start date (2025-08-04)';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_attendance_date_trigger ON public.attendance;
CREATE TRIGGER check_attendance_date_trigger
BEFORE INSERT OR UPDATE ON public.attendance
FOR EACH ROW EXECUTE FUNCTION check_attendance_date();

-- ==========================================
-- Step 5: Row Level Security (RLS)
-- ==========================================

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION is_mentor() RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'mentor');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Students RLS
DROP POLICY IF EXISTS "Mentors can manage students" ON public.students;
DROP POLICY IF EXISTS "Students can read own profile" ON public.students;
DROP POLICY IF EXISTS "Public read for student count" ON public.students;
DROP POLICY IF EXISTS "Authenticated can read students" ON public.students;
-- Allow all authenticated users to read students (needed for counts and mentor views)
CREATE POLICY "Authenticated can read students" ON public.students FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Mentors can manage students" ON public.students FOR ALL USING (is_mentor());

-- Sessions RLS
DROP POLICY IF EXISTS "Mentors can manage sessions" ON public.sessions;
DROP POLICY IF EXISTS "Students can view all sessions" ON public.sessions;
DROP POLICY IF EXISTS "Anyone can view sessions" ON public.sessions;
CREATE POLICY "Mentors can manage sessions" ON public.sessions FOR ALL USING (is_mentor());
CREATE POLICY "Anyone can view sessions" ON public.sessions FOR SELECT USING (true);

-- Attendance RLS
DROP POLICY IF EXISTS "Mentors can manage attendance" ON public.attendance;
DROP POLICY IF EXISTS "Students can read own attendance" ON public.attendance;
CREATE POLICY "Mentors can manage attendance" ON public.attendance FOR ALL USING (is_mentor());
CREATE POLICY "Students can read own attendance" ON public.attendance FOR SELECT
  USING (student_id = (SELECT student_id FROM public.users WHERE id = auth.uid()));

-- Materials RLS
DROP POLICY IF EXISTS "Mentors can manage materials" ON public.materials;
DROP POLICY IF EXISTS "Students can view all materials" ON public.materials;
DROP POLICY IF EXISTS "Anyone can view materials" ON public.materials;
CREATE POLICY "Mentors can manage materials" ON public.materials FOR ALL USING (is_mentor());
CREATE POLICY "Anyone can view materials" ON public.materials FOR SELECT USING (true);

-- ImportLog RLS
DROP POLICY IF EXISTS "Mentors can manage import logs" ON public.import_log;
CREATE POLICY "Mentors can manage import logs" ON public.import_log FOR ALL USING (is_mentor());

-- Users RLS
DROP POLICY IF EXISTS "Mentors can read all users" ON public.users;
DROP POLICY IF EXISTS "Students can read own user" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Authenticated users read own profile" ON public.users;
-- Allow any authenticated user to read their own row
CREATE POLICY "Users can read own profile" ON public.users FOR SELECT USING (id = auth.uid());
-- Allow mentors to read all users
CREATE POLICY "Mentors can read all users" ON public.users FOR SELECT USING (is_mentor());

-- ==========================================
-- Step 6: Auth Trigger (Auto-create students)
-- ==========================================

CREATE OR REPLACE FUNCTION create_student_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    new_user_id UUID;
    user_email TEXT;
BEGIN
    -- Use lowercase USN + @forge.local so email validation doesn't interfere
    user_email := LOWER(NEW.usn) || '@forge.local';

    -- Check if auth user already exists
    SELECT id INTO new_user_id FROM auth.users WHERE email = user_email;

    IF new_user_id IS NULL THEN
        new_user_id := gen_random_uuid();

        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, recovery_sent_at, last_sign_in_at,
            raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at,
            confirmation_token, email_change, email_change_token_new, recovery_token
        )
        VALUES (
            '00000000-0000-0000-0000-000000000000',
            new_user_id,
            'authenticated', 'authenticated',
            user_email,
            -- Default password is USN in UPPERCASE (e.g. 4SH24CS001)
            crypt(UPPER(NEW.usn), gen_salt('bf')),
            NOW(), NULL, NULL,
            '{"provider":"email","providers":["email"]}', '{}',
            NOW(), NOW(),
            '', '', '', ''
        );

        -- CRITICAL: Insert into auth.identities (required for login in newer Supabase versions)
        INSERT INTO auth.identities (
            id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), new_user_id,
            format('{"sub":"%s","email":"%s"}', new_user_id::text, user_email)::jsonb,
            'email', new_user_id::text, NOW(), NOW(), NOW()
        );
    END IF;

    -- Upsert public.users profile
    INSERT INTO public.users (id, email, role, student_id, display_name)
    VALUES (new_user_id, user_email, 'student', NEW.id, NEW.name)
    ON CONFLICT (id) DO UPDATE
      SET student_id = EXCLUDED.student_id,
          display_name = EXCLUDED.display_name;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_student_created ON public.students;
CREATE TRIGGER on_student_created
AFTER INSERT ON public.students
FOR EACH ROW EXECUTE FUNCTION create_student_auth_user();

-- ==========================================
-- Step 7: Seed Data
-- ==========================================

-- Mentors
DO $$
DECLARE
    mentor1_id UUID;
    mentor2_id UUID;
BEGIN
    -- Mentor 1
    SELECT id INTO mentor1_id FROM auth.users WHERE email = 'nischay@theboringpeople.in';
    IF mentor1_id IS NULL THEN
        mentor1_id := gen_random_uuid();
        INSERT INTO auth.users (
            id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
            mentor1_id, 'authenticated', 'authenticated',
            'nischay@theboringpeople.in',
            crypt('password123', gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}', '{}',
            NOW(), NOW()
        );
    END IF;

    -- Mentor 2
    SELECT id INTO mentor2_id FROM auth.users WHERE email = 'varun@theboringpeople.in';
    IF mentor2_id IS NULL THEN
        mentor2_id := gen_random_uuid();
        INSERT INTO auth.users (
            id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
            mentor2_id, 'authenticated', 'authenticated',
            'varun@theboringpeople.in',
            crypt('password123', gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}', '{}',
            NOW(), NOW()
        );
    END IF;

    -- Upsert public.users for mentors
    INSERT INTO public.users (id, email, role, display_name)
    VALUES
        (mentor1_id, 'nischay@theboringpeople.in', 'mentor', 'Nischay B K'),
        (mentor2_id, 'varun@theboringpeople.in', 'mentor', 'Varun')
    ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, role = EXCLUDED.role;
END $$;

-- Students will be imported via CSV
