-- ============================================================
-- ForgeTrack: Repair Missing public.users Profiles
-- Run this in Supabase SQL Editor if login still doesn't work.
-- This reconciles auth.users ↔ public.users gaps.
-- ============================================================

-- Step 1: Re-insert mentor profiles (safe to re-run)
DO $$
DECLARE
    mentor1_id UUID;
    mentor2_id UUID;
BEGIN
    SELECT id INTO mentor1_id FROM auth.users WHERE email = 'nischay@theboringpeople.in';
    SELECT id INTO mentor2_id FROM auth.users WHERE email = 'varun@theboringpeople.in';

    IF mentor1_id IS NOT NULL THEN
        INSERT INTO public.users (id, email, role, display_name)
        VALUES (mentor1_id, 'nischay@theboringpeople.in', 'mentor', 'Nischay B K')
        ON CONFLICT (id) DO UPDATE SET role = 'mentor', display_name = 'Nischay B K';
        RAISE NOTICE 'Mentor 1 (Nischay) profile OK: %', mentor1_id;
    ELSE
        RAISE WARNING 'Mentor 1 not found in auth.users!';
    END IF;

    IF mentor2_id IS NOT NULL THEN
        INSERT INTO public.users (id, email, role, display_name)
        VALUES (mentor2_id, 'varun@theboringpeople.in', 'mentor', 'Varun')
        ON CONFLICT (id) DO UPDATE SET role = 'mentor', display_name = 'Varun';
        RAISE NOTICE 'Mentor 2 (Varun) profile OK: %', mentor2_id;
    ELSE
        RAISE WARNING 'Mentor 2 not found in auth.users!';
    END IF;
END $$;

-- Step 2: Re-link student auth users to public.users
-- For every student in public.students, find their auth user (email = usn@forge.local)
-- and make sure public.users has a matching row.
DO $$
DECLARE
    s RECORD;
    auth_uid UUID;
    inserted_count INT := 0;
    skipped_count INT := 0;
BEGIN
    FOR s IN SELECT id, name, usn FROM public.students LOOP
        SELECT id INTO auth_uid
        FROM auth.users
        WHERE email = s.usn || '@forge.local';

        IF auth_uid IS NOT NULL THEN
            INSERT INTO public.users (id, email, role, student_id, display_name)
            VALUES (
                auth_uid,
                s.usn || '@forge.local',
                'student',
                s.id,
                s.name
            )
            ON CONFLICT (id) DO UPDATE
              SET student_id   = EXCLUDED.student_id,
                  display_name = EXCLUDED.display_name,
                  role         = 'student';
            inserted_count := inserted_count + 1;
        ELSE
            -- Auth user missing — create it
            auth_uid := gen_random_uuid();
            INSERT INTO auth.users (
                instance_id, id, aud, role, email, encrypted_password,
                email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                created_at, updated_at,
                confirmation_token, email_change, email_change_token_new, recovery_token
            ) VALUES (
                '00000000-0000-0000-0000-000000000000',
                auth_uid,
                'authenticated', 'authenticated',
                s.usn || '@forge.local',
                crypt(s.usn, gen_salt('bf')),
                NOW(),
                '{"provider":"email","providers":["email"]}', '{}',
                NOW(), NOW(),
                '', '', '', ''
            );

            INSERT INTO public.users (id, email, role, student_id, display_name)
            VALUES (auth_uid, s.usn || '@forge.local', 'student', s.id, s.name)
            ON CONFLICT (id) DO NOTHING;

            skipped_count := skipped_count + 1;
            RAISE NOTICE 'Created missing auth user for student %: %', s.usn, auth_uid;
        END IF;
    END LOOP;

    RAISE NOTICE 'Done. Updated: %, Created new auth users: %', inserted_count, skipped_count;
END $$;

-- Step 3: Final verification — show all user profiles
SELECT
    u.id,
    u.email,
    u.role,
    u.display_name,
    u.student_id,
    CASE WHEN au.id IS NOT NULL THEN 'OK' ELSE 'MISSING IN AUTH.USERS' END AS auth_status
FROM public.users u
LEFT JOIN auth.users au ON au.id = u.id
ORDER BY u.role, u.display_name;
