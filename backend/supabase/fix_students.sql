-- ==========================================
-- FORGETRACK STUDENTS FIX SCRIPT (FINAL)
-- Run this in your Supabase SQL Editor
-- ==========================================

-- 1. Drop the old trigger to replace it
DROP TRIGGER IF EXISTS on_student_created ON public.students;

-- 2. Update the function to properly create auth.identities
CREATE OR REPLACE FUNCTION create_student_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    new_user_id UUID;
    user_email TEXT;
BEGIN
    -- Use example.com to avoid domain validation issues
    user_email := NEW.usn || '@example.com';

    -- Check if auth user already exists
    SELECT id INTO new_user_id FROM auth.users WHERE email = user_email;

    IF new_user_id IS NULL THEN
        new_user_id := gen_random_uuid();
        
        -- Insert into auth.users
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
            confirmation_token, email_change, email_change_token_new, recovery_token
        )
        VALUES (
            '00000000-0000-0000-0000-000000000000',
            new_user_id, 'authenticated', 'authenticated', user_email,
            crypt(NEW.usn, gen_salt('bf')), NOW(),
            '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(),
            '', '', '', ''
        );

        -- CRITICAL: Insert into auth.identities (Required for login in newer Supabase versions)
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

-- 3. Re-attach the trigger
CREATE TRIGGER on_student_created
AFTER INSERT ON public.students
FOR EACH ROW EXECUTE FUNCTION create_student_auth_user();

-- 4. Clean up any broken student records so we can insert them cleanly
DELETE FROM public.students;

-- 5. Insert the students
INSERT INTO public.students (name, usn, branch_code) VALUES
('Aarav Patel',       '4SH24CS001', 'CS'), ('Vihaan Sharma',    '4SH24AI002', 'AI'), ('Vivaan Singh',      '4SH24IS003', 'IS'),
('Ananya Gupta',      '4SH24CS004', 'CS'), ('Diya Kumar',       '4SH24AI005', 'AI'), ('Aditya Desai',      '4SH24IS006', 'IS'),
('Arjun Reddy',       '4SH24CS007', 'CS'), ('Sai Krishna',      '4SH24AI008', 'AI'), ('Riya Mehta',        '4SH24IS009', 'IS'),
('Isha Joshi',        '4SH24CS010', 'CS'), ('Aisha Khan',       '4SH24AI011', 'AI'), ('Krishna Nair',      '4SH24IS012', 'IS'),
('Kabir Das',         '4SH24CS013', 'CS'), ('Shaurya Iyer',     '4SH24AI014', 'AI'), ('Aarohi Pillai',     '4SH24IS015', 'IS'),
('Atharv Menon',      '4SH24CS016', 'CS'), ('Advik Verma',      '4SH24AI017', 'AI'), ('Kavya Rao',         '4SH24IS018', 'IS'),
('Navya Bhat',        '4SH24CS019', 'CS'), ('Reyansh Kulkarni', '4SH24AI020', 'AI'), ('Ayaan Hegde',       '4SH24IS021', 'IS'),
('Ishaan M',          '4SH24CS022', 'CS'), ('Pari G',           '4SH24AI023', 'AI'), ('Anvi P',            '4SH24IS024', 'IS'),
('Myra S',            '4SH24CS025', 'CS');

-- 6. Re-run attendance seeding since students are now recreated
DO $$
DECLARE
    student record;
    sess record;
    is_present boolean;
BEGIN
    FOR student IN SELECT id FROM public.students LOOP
        FOR sess IN SELECT id FROM public.sessions LOOP
            is_present := random() > 0.2;
            INSERT INTO public.attendance (student_id, session_id, present)
            VALUES (student.id, sess.id, is_present)
            ON CONFLICT (student_id, session_id) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;
