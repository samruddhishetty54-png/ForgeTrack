import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gbvoyzjebhxbjxrqfkkm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdidm95emplYmh4Ymp4cnFma2ttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2MTEzMTEsImV4cCI6MjA5MzE4NzMxMX0.ABSpFA2AXhaMdJpGnFCCIsIWRtSOc9pN14HuNcCiCSI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin() {
  console.log('Testing student login: 4SF24CI140...');
  
  // Try @forge.local
  const res1 = await supabase.auth.signInWithPassword({
    email: '4sf24ci140@forge.local',
    password: '4SF24CI140'
  });
  console.log('@forge.local attempt:', res1.error ? res1.error.message : 'Success');
  
  // Try @example.com
  const res2 = await supabase.auth.signInWithPassword({
    email: '4sf24ci140@example.com',
    password: '4SF24CI140'
  });
  console.log('@example.com attempt:', res2.error ? res2.error.message : 'Success');

  // Check if they are in public.students at all
  const { data, error } = await supabase.from('students').select('*').eq('usn', '4SF24CI140');
  console.log('Student record in DB:', data);
}

testLogin();
