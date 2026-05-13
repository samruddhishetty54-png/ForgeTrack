-- ==========================================
-- DANGER: DATA WIPE SCRIPT
-- Run this in your Supabase SQL Editor ONLY if you want to 
-- completely reset your database and start fresh with just the mentor account.
-- ==========================================

-- 1. Wipe all data (this deletes everything except auth accounts)
TRUNCATE public.attendance CASCADE;
TRUNCATE public.materials CASCADE;
TRUNCATE public.sessions CASCADE;
TRUNCATE public.import_log CASCADE;

-- Safely delete students without wiping the entire users table (which CASCADE does)
DELETE FROM public.users WHERE role = 'student';
DELETE FROM public.students;

-- 2. Delete all students from Auth
DELETE FROM auth.users WHERE email LIKE '%@example.com' OR email LIKE '%@forge.local';

-- 3. The Mentor account will remain intact because we didn't wipe public.users
-- Your mentor account (nischay@theboringpeople.in) is safe.
