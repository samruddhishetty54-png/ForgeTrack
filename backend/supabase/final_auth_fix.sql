-- ==========================================
-- FINAL AUTH FIX SCRIPT (WITH ERROR LOGGING)
-- Run this in your Supabase SQL Editor
-- ==========================================

-- 1. Create a debug logs table so we can see what goes wrong
CREATE TABLE IF NOT EXISTS public.debug_logs (
  id SERIAL PRIMARY KEY,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ensure anyone can read the logs so the AI can fetch them
ALTER TABLE public.debug_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon read logs" ON public.debug_logs;
CREATE POLICY "anon read logs" ON public.debug_logs FOR SELECT USING (true);

-- Clear old logs
DELETE FROM public.debug_logs;

-- 2. Setup environment
SET search_path TO public, auth, extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 3. Run the insert block with error catching
DO $$
DECLARE
  rec record;
  existing_auth_id UUID;
  new_auth_id UUID;
  user_email TEXT;
  new_student_id INTEGER;
  err_msg TEXT;
  err_detail TEXT;
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
    
    BEGIN
      user_email := LOWER(rec.usn || '@example.com');
      SELECT id INTO existing_auth_id FROM auth.users WHERE email = user_email;
      
      IF existing_auth_id IS NULL THEN
        new_auth_id := gen_random_uuid();
        INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES (new_auth_id, 'authenticated', 'authenticated', user_email, crypt(rec.usn, gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW());
        
        INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
        VALUES (gen_random_uuid(), new_auth_id, format('{"sub":"%s","email":"%s"}', new_auth_id::text, user_email)::jsonb, 'email', new_auth_id::text, NOW(), NOW(), NOW());
      ELSE
        new_auth_id := existing_auth_id;
        IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = new_auth_id) THEN
          INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
          VALUES (gen_random_uuid(), new_auth_id, format('{"sub":"%s","email":"%s"}', new_auth_id::text, user_email)::jsonb, 'email', new_auth_id::text, NOW(), NOW(), NOW());
        END IF;
      END IF;
      
      INSERT INTO public.students (name, usn, branch_code) VALUES (rec.name, rec.usn, rec.branch_code) ON CONFLICT DO NOTHING RETURNING id INTO new_student_id;
      
      IF new_student_id IS NOT NULL THEN
        INSERT INTO public.users (id, email, role, student_id, display_name) VALUES (new_auth_id, user_email, 'student', new_student_id, rec.name) ON CONFLICT DO NOTHING;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS err_msg = MESSAGE_TEXT, err_detail = PG_EXCEPTION_DETAIL;
      INSERT INTO public.debug_logs (error_message) VALUES ('Error processing ' || rec.usn || ': ' || err_msg || ' DETAIL: ' || COALESCE(err_detail, ''));
    END;
    
  END LOOP;
END $$;
