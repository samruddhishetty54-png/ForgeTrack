-- ==========================================
-- ADD MENTOR CREDENTIALS
-- Adds nischay@theboringpeople.in and nischaybk@theboringpeople.in
-- Password: password123
-- ==========================================

DO $$
DECLARE
    mentor1_id UUID;
    mentor2_id UUID;
BEGIN
    -- 1. nischay@theboringpeople.in
    SELECT id INTO mentor1_id FROM auth.users WHERE email = 'nischay@theboringpeople.in';
    IF mentor1_id IS NULL THEN
        mentor1_id := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role, instance_id)
        VALUES (mentor1_id, 'nischay@theboringpeople.in', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
        
        -- Identity record
        INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
        VALUES (gen_random_uuid(), mentor1_id, format('{"sub":"%s","email":"%s"}', mentor1_id::text, 'nischay@theboringpeople.in')::jsonb, 'email', mentor1_id::text, NOW(), NOW(), NOW());
    ELSE
        UPDATE auth.users SET encrypted_password = crypt('password123', gen_salt('bf')) WHERE id = mentor1_id;
    END IF;

    INSERT INTO public.users (id, email, role, display_name)
    VALUES (mentor1_id, 'nischay@theboringpeople.in', 'mentor', 'Nischay')
    ON CONFLICT (id) DO UPDATE SET role = 'mentor', display_name = 'Nischay';


    -- 2. nischaybk@theboringpeople.in
    SELECT id INTO mentor2_id FROM auth.users WHERE email = 'nischaybk@theboringpeople.in';
    IF mentor2_id IS NULL THEN
        mentor2_id := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role, instance_id)
        VALUES (mentor2_id, 'nischaybk@theboringpeople.in', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
        
        -- Identity record
        INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
        VALUES (gen_random_uuid(), mentor2_id, format('{"sub":"%s","email":"%s"}', mentor2_id::text, 'nischaybk@theboringpeople.in')::jsonb, 'email', mentor2_id::text, NOW(), NOW(), NOW());
    ELSE
        UPDATE auth.users SET encrypted_password = crypt('password123', gen_salt('bf')) WHERE id = mentor2_id;
    END IF;

    INSERT INTO public.users (id, email, role, display_name)
    VALUES (mentor2_id, 'nischaybk@theboringpeople.in', 'mentor', 'Nischay BK')
    ON CONFLICT (id) DO UPDATE SET role = 'mentor', display_name = 'Nischay BK';

END $$;
