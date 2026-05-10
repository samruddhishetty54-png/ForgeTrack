-- ==========================================
-- FINAL AUTH FIX SCRIPT
-- Run this AFTER importing students via BulkAttendance
-- to repair any missing auth accounts.
-- ==========================================

-- 1. Optional debug logs table
CREATE TABLE IF NOT EXISTS public.debug_logs (
  id SERIAL PRIMARY KEY,
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.debug_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon read logs" ON public.debug_logs;
CREATE POLICY "anon read logs" ON public.debug_logs FOR SELECT USING (true);

DELETE FROM public.debug_logs;

-- 2. Setup environment
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 3. Create auth accounts for every student currently in public.students
DO $$
DECLARE
    s RECORD;
    user_email TEXT;
    existing_auth_id UUID;
    new_auth_id UUID;
    err_msg TEXT;
    err_detail TEXT;
BEGIN
    FOR s IN SELECT id, name, usn FROM public.students LOOP
        BEGIN
            user_email := LOWER(s.usn) || '@forge.local';

            SELECT id INTO existing_auth_id FROM auth.users WHERE email = user_email;

            IF existing_auth_id IS NULL THEN
                new_auth_id := gen_random_uuid();

                INSERT INTO auth.users (
                    id, aud, role, email, encrypted_password, email_confirmed_at,
                    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
                )
                VALUES (
                    new_auth_id, 'authenticated', 'authenticated',
                    user_email,
                    crypt(UPPER(s.usn), gen_salt('bf')),
                    NOW(),
                    '{"provider":"email","providers":["email"]}', '{}',
                    NOW(), NOW()
                );

                INSERT INTO auth.identities (
                    id, user_id, identity_data, provider, provider_id,
                    last_sign_in_at, created_at, updated_at
                ) VALUES (
                    gen_random_uuid(), new_auth_id,
                    format('{"sub":"%s","email":"%s"}', new_auth_id::text, user_email)::jsonb,
                    'email', new_auth_id::text, NOW(), NOW(), NOW()
                );

                INSERT INTO public.debug_logs (message)
                VALUES ('Created auth account for: ' || s.usn);
            ELSE
                new_auth_id := existing_auth_id;

                IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = new_auth_id) THEN
                    INSERT INTO auth.identities (
                        id, user_id, identity_data, provider, provider_id,
                        last_sign_in_at, created_at, updated_at
                    ) VALUES (
                        gen_random_uuid(), new_auth_id,
                        format('{"sub":"%s","email":"%s"}', new_auth_id::text, user_email)::jsonb,
                        'email', new_auth_id::text, NOW(), NOW(), NOW()
                    );
                END IF;

                INSERT INTO public.debug_logs (message)
                VALUES ('Auth account already exists for: ' || s.usn);
            END IF;

            -- Ensure public.users profile
            INSERT INTO public.users (id, email, role, student_id, display_name)
            VALUES (new_auth_id, user_email, 'student', s.id, s.name)
            ON CONFLICT (id) DO UPDATE
              SET student_id = EXCLUDED.student_id,
                  display_name = EXCLUDED.display_name;

        EXCEPTION WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS err_msg = MESSAGE_TEXT, err_detail = PG_EXCEPTION_DETAIL;
            INSERT INTO public.debug_logs (message)
            VALUES ('ERROR for ' || s.usn || ': ' || err_msg || ' | ' || COALESCE(err_detail, ''));
        END;
    END LOOP;
END $$;

-- View results
SELECT * FROM public.debug_logs ORDER BY created_at;
