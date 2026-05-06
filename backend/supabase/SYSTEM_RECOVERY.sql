-- ==========================================
-- FINAL DATABASE REPAIR & SEED SCRIPT
-- ForgeTrack System Recovery (v2)
-- ==========================================

-- 1. CLEANUP EVERYTHING
TRUNCATE public.attendance CASCADE;
TRUNCATE public.materials CASCADE;
TRUNCATE public.sessions CASCADE;
TRUNCATE public.users CASCADE;
TRUNCATE public.students CASCADE;

-- 2. CREATE STUDENTS
INSERT INTO public.students (name, usn, branch_code, is_active) VALUES
('Aarav Patel',       '4SH24CS001', 'CS', true), 
('Vihaan Sharma',    '4SH24AI002', 'AI', true), 
('Vivaan Singh',      '4SH24IS003', 'IS', true),
('Ananya Gupta',      '4SH24CS004', 'CS', true), 
('Diya Kumar',       '4SH24AI005', 'AI', true), 
('Aditya Desai',      '4SH24IS006', 'IS', true),
('Arjun Reddy',       '4SH24CS007', 'CS', true), 
('Sai Krishna',      '4SH24AI008', 'AI', true), 
('Riya Mehta',        '4SH24IS009', 'IS', true),
('Isha Joshi',        '4SH24CS010', 'CS', true), 
('Aisha Khan',       '4SH24AI011', 'AI', true), 
('Krishna Nair',      '4SH24IS012', 'IS', true),
('Kabir Das',         '4SH24CS013', 'CS', true), 
('Shaurya Iyer',     '4SH24AI014', 'AI', true), 
('Aarohi Pillai',     '4SH24IS015', 'IS', true),
('Atharv Menon',      '4SH24CS016', 'CS', true), 
('Advik Verma',      '4SH24AI017', 'AI', true), 
('Kavya Rao',         '4SH24IS018', 'IS', true),
('Navya Bhat',        '4SH24CS019', 'CS', true), 
('Reyansh Kulkarni', '4SH24AI020', 'AI', true), 
('Ayaan Hegde',       '4SH24IS021', 'IS', true),
('Ishaan M',          '4SH24CS022', 'CS', true), 
('Pari G',           '4SH24AI023', 'AI', true), 
('Anvi P',            '4SH24IS024', 'IS', true),
('Myra S',            '4SH24CS025', 'CS', true)
ON CONFLICT (usn) DO NOTHING;

-- 3. CREATE SESSIONS (Past and Future)
INSERT INTO public.sessions (date, topic, month_number, duration_hours, session_type, notes) VALUES
('2025-08-05', 'Program Kickoff',               4, 2.0, 'offline', 'intro session'),
('2025-08-08', '8-Layer AI Stack',              4, 2.0, 'offline', 'laptops are required'),
('2025-08-12', 'Python Crash Course',           4, 2.0, 'offline', 'basic syntax'),
('2025-08-15', 'Data Structures for AI',        4, 2.0, 'offline', 'lists and dicts')
ON CONFLICT (date) DO NOTHING;

-- 4. FIX USERS & AUTH (Robust Version)
DO $$
DECLARE
    s RECORD;
    sess RECORD;
    auth_uid UUID;
    mentor_id UUID;
    counter INT := 0;
BEGIN
    -- MENTOR REPAIR
    SELECT id INTO mentor_id FROM auth.users WHERE email = 'nischay@theboringpeople.in';
    IF mentor_id IS NULL THEN
        mentor_id := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role, instance_id)
        VALUES (mentor_id, 'nischay@theboringpeople.in', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
    END IF;
    INSERT INTO public.users (id, email, role, display_name)
    VALUES (mentor_id, 'nischay@theboringpeople.in', 'mentor', 'Nischay Mentor')
    ON CONFLICT (id) DO UPDATE SET role = 'mentor', display_name = 'Nischay Mentor';

    -- STUDENT REPAIR & SEED ATTENDANCE
    FOR s IN SELECT id, name, usn FROM public.students LOOP
        -- Auth account
        SELECT id INTO auth_uid FROM auth.users WHERE email = LOWER(s.usn || '@example.com');
        IF auth_uid IS NULL THEN
            auth_uid := gen_random_uuid();
            INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role, instance_id)
            VALUES (auth_uid, LOWER(s.usn || '@example.com'), crypt(s.usn, gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
        END IF;

        -- Public profile
        INSERT INTO public.users (id, email, role, student_id, display_name)
        VALUES (auth_uid, LOWER(s.usn || '@example.com'), 'student', s.id, s.name)
        ON CONFLICT (id) DO UPDATE SET student_id = EXCLUDED.student_id, role = 'student', display_name = EXCLUDED.display_name;

        -- Seed Attendance (75% goal)
        -- We have 4 sessions. To get 75%, we mark 3 present and 1 absent.
        counter := 0;
        FOR sess IN SELECT id FROM public.sessions ORDER BY date ASC LOOP
            counter := counter + 1;
            INSERT INTO public.attendance (student_id, session_id, present, marked_by, marked_at)
            VALUES (s.id, sess.id, (counter <= 3), mentor_id, NOW())
            ON CONFLICT (student_id, session_id) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- 5. APPLY SECURITY POLICIES
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read students" ON public.students;
CREATE POLICY "Public read students" ON public.students FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read sessions" ON public.sessions;
CREATE POLICY "Public read sessions" ON public.sessions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users read own profile" ON public.users;
CREATE POLICY "Users read own profile" ON public.users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Students read own attendance" ON public.attendance;
CREATE POLICY "Students read own attendance" ON public.attendance FOR SELECT 
USING (student_id = (SELECT student_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Mentors manage all" ON public.attendance;
CREATE POLICY "Mentors manage all" ON public.attendance FOR ALL 
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'mentor'));
