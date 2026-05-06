-- ==========================================
-- FORGETRACK BULLETPROOF FIX SCRIPT
-- Run this in your Supabase SQL Editor
-- ==========================================

-- 1. Ensure pgcrypto is available in public schema so crypt() works
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;

-- 2. Drop the faulty trigger so it stops blocking student inserts
DROP TRIGGER IF EXISTS on_student_created ON public.students;
DROP FUNCTION IF EXISTS create_student_auth_user();

-- 3. Clear existing students safely
DELETE FROM public.attendance;
DELETE FROM public.users WHERE role = 'student';
DELETE FROM public.students;

-- 4. Insert exactly what is needed into auth.users safely
DO $$
DECLARE
  rec record;
  existing_auth_id UUID;
  new_auth_id UUID;
  user_email TEXT;
  new_student_id INTEGER;
BEGIN
  FOR rec IN SELECT * FROM (VALUES 
    ('Aarav Patel', '4SH24CS001', 'CS'), ('Vihaan Sharma', '4SH24AI002', 'AI'), ('Vivaan Singh', '4SH24IS003', 'IS'),
    ('Ananya Gupta', '4SH24CS004', 'CS'), ('Diya Kumar', '4SH24AI005', 'AI'), ('Aditya Desai', '4SH24IS006', 'IS'),
    ('Arjun Reddy', '4SH24CS007', 'CS'), ('Sai Krishna', '4SH24AI008', 'AI'), ('Riya Mehta', '4SH24IS009', 'IS'),
    ('Isha Joshi', '4SH24CS010', 'CS'), ('Aisha Khan', '4SH24AI011', 'AI'), ('Krishna Nair', '4SH24IS012', 'IS'),
    ('Kabir Das', '4SH24CS013', 'CS'), ('Shaurya Iyer', '4SH24AI014', 'AI'), ('Aarohi Pillai', '4SH24IS015', 'IS'),
    ('Atharv Menon', '4SH24CS016', 'CS'), ('Advik Verma', '4SH24AI017', 'AI'), ('Kavya Rao', '4SH24IS018', 'IS'),
    ('Navya Bhat', '4SH24CS019', 'CS'), ('Reyansh Kulkarni', '4SH24AI020', 'AI'), ('Ayaan Hegde', '4SH24IS021', 'IS'),
    ('Ishaan M', '4SH24CS022', 'CS'), ('Pari G', '4SH24AI023', 'AI'), ('Anvi P', '4SH24IS024', 'IS'),
    ('Myra S', '4SH24CS025', 'CS')
  ) AS t(name, usn, branch_code) LOOP
    user_email := LOWER(rec.usn || '@example.com');
    
    -- Check if they already exist in auth.users
    SELECT id INTO existing_auth_id FROM auth.users WHERE email = user_email;
    
    IF existing_auth_id IS NULL THEN
      new_auth_id := gen_random_uuid();
      
      -- Insert minimal required columns into auth.users 
      INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
      VALUES (new_auth_id, 'authenticated', 'authenticated', user_email, extensions.crypt(rec.usn, extensions.gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW());
      
      -- Insert required identity for password login
      INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
      VALUES (gen_random_uuid(), new_auth_id, format('{"sub":"%s","email":"%s"}', new_auth_id::text, user_email)::jsonb, 'email', new_auth_id::text, NOW(), NOW(), NOW());
    ELSE
      new_auth_id := existing_auth_id;
      
      -- They already exist, ensure they have an identity record
      IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = new_auth_id) THEN
        INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
        VALUES (gen_random_uuid(), new_auth_id, format('{"sub":"%s","email":"%s"}', new_auth_id::text, user_email)::jsonb, 'email', new_auth_id::text, NOW(), NOW(), NOW());
      END IF;
    END IF;
    
    -- Insert into public.students
    INSERT INTO public.students (name, usn, branch_code) 
    VALUES (rec.name, rec.usn, rec.branch_code) 
    RETURNING id INTO new_student_id;
    
    -- Insert into public.users
    INSERT INTO public.users (id, email, role, student_id, display_name) 
    VALUES (new_auth_id, user_email, 'student', new_student_id, rec.name);
  END LOOP;
END $$;

-- 6. Generate Attendance
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

-- Clean up complete
