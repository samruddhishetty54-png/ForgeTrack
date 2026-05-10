-- ============================================================
-- FORGETRACK: ACTIVATE STUDENT LOGINS
-- Run this in Supabase SQL Editor AFTER importing students.
--
-- What it does:
--   1. Updates the trigger to correctly create auth accounts
--      for any new student added via BulkAttendance.
--   2. Repairs auth accounts for all students ALREADY in the DB.
--
-- Student login credentials:
--   Identifier : USN  (e.g.  4SF24CI140)
--   Password   : USN in UPPERCASE  (e.g.  4SF24CI140)
-- ============================================================

-- Step 1: Update the trigger function
CREATE OR REPLACE FUNCTION create_student_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    new_user_id UUID;
    user_email  TEXT;
BEGIN
    -- email = lowercase(USN)@forge.local
    user_email := LOWER(NEW.usn) || '@forge.local';

    -- Avoid duplicate creation
    SELECT id INTO new_user_id FROM auth.users WHERE email = user_email;

    IF new_user_id IS NULL THEN
        new_user_id := gen_random_uuid();

        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at,
            confirmation_token, email_change, email_change_token_new, recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            new_user_id, 'authenticated', 'authenticated',
            user_email,
            crypt(UPPER(NEW.usn), gen_salt('bf')),  -- password = UPPERCASE USN
            NOW(),
            '{"provider":"email","providers":["email"]}', '{}',
            NOW(), NOW(),
            '', '', '', ''
        );

        -- Required in newer Supabase versions for password login to work
        INSERT INTO auth.identities (
            id, user_id, identity_data, provider, provider_id,
            last_sign_in_at, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), new_user_id,
            format('{"sub":"%s","email":"%s"}', new_user_id::text, user_email)::jsonb,
            'email', new_user_id::text,
            NOW(), NOW(), NOW()
        );
    END IF;

    -- Create / update public.users profile
    INSERT INTO public.users (id, email, role, student_id, display_name)
    VALUES (new_user_id, user_email, 'student', NEW.id, NEW.name)
    ON CONFLICT (id) DO UPDATE
        SET student_id   = EXCLUDED.student_id,
            display_name = EXCLUDED.display_name,
            role         = 'student';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach the trigger
DROP TRIGGER IF EXISTS on_student_created ON public.students;
CREATE TRIGGER on_student_created
    AFTER INSERT ON public.students
    FOR EACH ROW EXECUTE FUNCTION create_student_auth_user();

-- ============================================================
-- Step 2: Repair auth accounts for students already in the DB
-- ============================================================
DO $$
DECLARE
    s            RECORD;
    user_email   TEXT;
    auth_uid     UUID;
    created_count INT := 0;
    repaired_count INT := 0;
BEGIN
    FOR s IN SELECT id, name, usn FROM public.students ORDER BY id LOOP

        user_email := LOWER(s.usn) || '@forge.local';

        -- Check if auth account already exists
        SELECT id INTO auth_uid FROM auth.users WHERE email = user_email;

        IF auth_uid IS NULL THEN
            -- Create missing auth account
            auth_uid := gen_random_uuid();

            INSERT INTO auth.users (
                instance_id, id, aud, role, email, encrypted_password,
                email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                created_at, updated_at,
                confirmation_token, email_change, email_change_token_new, recovery_token
            ) VALUES (
                '00000000-0000-0000-0000-000000000000',
                auth_uid, 'authenticated', 'authenticated',
                user_email,
                crypt(UPPER(s.usn), gen_salt('bf')),
                NOW(),
                '{"provider":"email","providers":["email"]}', '{}',
                NOW(), NOW(),
                '', '', '', ''
            );

            INSERT INTO auth.identities (
                id, user_id, identity_data, provider, provider_id,
                last_sign_in_at, created_at, updated_at
            ) VALUES (
                gen_random_uuid(), auth_uid,
                format('{"sub":"%s","email":"%s"}', auth_uid::text, user_email)::jsonb,
                'email', auth_uid::text,
                NOW(), NOW(), NOW()
            );

            created_count := created_count + 1;
        ELSE
            -- Ensure auth.identities row exists (missing = login fails silently)
            IF NOT EXISTS (
                SELECT 1 FROM auth.identities WHERE user_id = auth_uid
            ) THEN
                INSERT INTO auth.identities (
                    id, user_id, identity_data, provider, provider_id,
                    last_sign_in_at, created_at, updated_at
                ) VALUES (
                    gen_random_uuid(), auth_uid,
                    format('{"sub":"%s","email":"%s"}', auth_uid::text, user_email)::jsonb,
                    'email', auth_uid::text,
                    NOW(), NOW(), NOW()
                );
                repaired_count := repaired_count + 1;
            END IF;
        END IF;

        -- Upsert public.users profile
        INSERT INTO public.users (id, email, role, student_id, display_name)
        VALUES (auth_uid, user_email, 'student', s.id, s.name)
        ON CONFLICT (id) DO UPDATE
            SET student_id   = EXCLUDED.student_id,
                display_name = EXCLUDED.display_name,
                role         = 'student';

    END LOOP;

    RAISE NOTICE '✓ Done. Created: % new accounts. Repaired: % identity records.',
        created_count, repaired_count;
END $$;

-- ============================================================
-- Step 3: Verify — see which students now have auth accounts
-- ============================================================
SELECT
    s.usn,
    s.name,
    LOWER(s.usn) || '@forge.local'  AS login_email,
    CASE WHEN u.id IS NOT NULL THEN '✓ Ready' ELSE '✗ Missing' END AS auth_status
FROM public.students s
LEFT JOIN public.users u ON u.student_id = s.id AND u.role = 'student'
ORDER BY s.usn;
