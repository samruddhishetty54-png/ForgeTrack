-- ==========================================
-- FORGETRACK: FIX STUDENT AUTH TRIGGER
-- Run this ONCE to ensure the trigger is correct.
-- Students are imported via the BulkAttendance page — no hardcoded data.
-- ==========================================

-- 1. Drop and recreate the trigger function with correct @forge.local email format
DROP TRIGGER IF EXISTS on_student_created ON public.students;

CREATE OR REPLACE FUNCTION create_student_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    new_user_id UUID;
    user_email TEXT;
BEGIN
    -- Use @forge.local so email validation doesn't interfere
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
            -- Default password is the USN in UPPERCASE
            crypt(UPPER(NEW.usn), gen_salt('bf')), NOW(),
            '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(),
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

-- 2. Re-attach the trigger
CREATE TRIGGER on_student_created
AFTER INSERT ON public.students
FOR EACH ROW EXECUTE FUNCTION create_student_auth_user();

-- Done. Students imported via BulkAttendance will now automatically get login accounts.
-- Login: USN as identifier, USN (uppercase) as password.
