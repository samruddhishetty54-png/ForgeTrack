-- ==========================================
-- FORGETRACK: REPAIR AUTH FOR EXISTING STUDENTS
-- Run this AFTER importing students via BulkAttendance
-- This creates auth accounts for any student in public.students
-- that doesn't yet have one.
-- ==========================================

-- 1. Ensure pgcrypto is available
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;

-- 2. Ensure the trigger function is up to date (uses @forge.local)
CREATE OR REPLACE FUNCTION create_student_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    new_user_id UUID;
    user_email TEXT;
BEGIN
    user_email := LOWER(NEW.usn) || '@forge.local';

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
            crypt(UPPER(NEW.usn), gen_salt('bf')), NOW(),
            '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(),
            '', '', '', ''
        );

        -- Insert into auth.identities (required for login in newer Supabase versions)
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

-- 3. Re-attach trigger
DROP TRIGGER IF EXISTS on_student_created ON public.students;
CREATE TRIGGER on_student_created
AFTER INSERT ON public.students
FOR EACH ROW EXECUTE FUNCTION create_student_auth_user();

-- 4. Repair: Create auth accounts for existing students that don't have one yet
DO $$
DECLARE
    s RECORD;
    user_email TEXT;
    existing_auth_id UUID;
    new_auth_id UUID;
BEGIN
    FOR s IN SELECT id, name, usn FROM public.students LOOP
        user_email := LOWER(s.usn) || '@forge.local';

        -- Check if auth account exists
        SELECT id INTO existing_auth_id FROM auth.users WHERE email = user_email;

        IF existing_auth_id IS NULL THEN
            new_auth_id := gen_random_uuid();

            INSERT INTO auth.users (
                instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                confirmation_token, email_change, email_change_token_new, recovery_token
            )
            VALUES (
                '00000000-0000-0000-0000-000000000000',
                new_auth_id, 'authenticated', 'authenticated', user_email,
                crypt(UPPER(s.usn), gen_salt('bf')), NOW(),
                '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(),
                '', '', '', ''
            );

            INSERT INTO auth.identities (
                id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
            ) VALUES (
                gen_random_uuid(), new_auth_id,
                format('{"sub":"%s","email":"%s"}', new_auth_id::text, user_email)::jsonb,
                'email', new_auth_id::text, NOW(), NOW(), NOW()
            );
        ELSE
            new_auth_id := existing_auth_id;

            -- Ensure identity record exists
            IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = new_auth_id) THEN
                INSERT INTO auth.identities (
                    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
                ) VALUES (
                    gen_random_uuid(), new_auth_id,
                    format('{"sub":"%s","email":"%s"}', new_auth_id::text, user_email)::jsonb,
                    'email', new_auth_id::text, NOW(), NOW(), NOW()
                );
            END IF;
        END IF;

        -- Ensure public.users profile exists
        INSERT INTO public.users (id, email, role, student_id, display_name)
        VALUES (new_auth_id, user_email, 'student', s.id, s.name)
        ON CONFLICT (id) DO UPDATE
          SET student_id = EXCLUDED.student_id,
              display_name = EXCLUDED.display_name;
    END LOOP;

    RAISE NOTICE 'Auth repair complete. All existing students now have login accounts.';
END $$;
