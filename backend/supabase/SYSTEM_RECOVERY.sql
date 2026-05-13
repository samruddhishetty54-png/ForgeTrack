-- ==========================================
-- FINAL DATABASE REPAIR & SEED SCRIPT
-- ForgeTrack System Recovery (v3)
-- Repairs mentor account + creates auth for all students in DB
-- Students are imported via BulkAttendance, NOT hardcoded here.
-- ==========================================



-- 4. FIX USERS & AUTH (Robust Version)
DO $$
DECLARE
    s RECORD;
    auth_uid UUID;
    mentor_id UUID;
BEGIN
    -- MENTOR REPAIR
    SELECT id INTO mentor_id FROM auth.users WHERE email = 'nischay@theboringpeople.in';
    IF mentor_id IS NULL THEN
        mentor_id := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role, instance_id)
        VALUES (mentor_id, 'nischay@theboringpeople.in', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
    ELSE
        -- Force reset password so you can definitely log in
        UPDATE auth.users SET encrypted_password = crypt('password123', gen_salt('bf')) WHERE id = mentor_id;
    END IF;
    INSERT INTO public.users (id, email, role, display_name)
    VALUES (mentor_id, 'nischay@theboringpeople.in', 'mentor', 'Nischay')
    ON CONFLICT (id) DO UPDATE SET role = 'mentor', display_name = 'Nischay';

    -- STUDENT REPAIR: Create/sync auth accounts for all students currently in DB
    -- (Students are imported via BulkAttendance CSV upload — not seeded here)
    FOR s IN SELECT id, name, usn FROM public.students LOOP
        -- Auth account uses @forge.local (matches the on_student_created trigger)
        SELECT id INTO auth_uid FROM auth.users WHERE email = LOWER(s.usn || '@forge.local');
        IF auth_uid IS NULL THEN
            auth_uid := gen_random_uuid();
            INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role, instance_id)
            VALUES (auth_uid, LOWER(s.usn || '@forge.local'), crypt(UPPER(s.usn), gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');

            -- Ensure auth.identities record exists for login to work
            INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
            VALUES (gen_random_uuid(), auth_uid, format('{"sub":"%s","email":"%s"}', auth_uid::text, LOWER(s.usn || '@forge.local'))::jsonb, 'email', auth_uid::text, NOW(), NOW(), NOW())
            ON CONFLICT DO NOTHING;
        END IF;

        -- Public profile
        INSERT INTO public.users (id, email, role, student_id, display_name)
        VALUES (auth_uid, LOWER(s.usn || '@forge.local'), 'student', s.id, s.name)
        ON CONFLICT (id) DO UPDATE SET student_id = EXCLUDED.student_id, role = 'student', display_name = EXCLUDED.display_name;

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
