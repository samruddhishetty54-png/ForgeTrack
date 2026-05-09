import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gbvoyzjebhxbjxrqfkkm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdidm95emplYmh4Ymp4cnFma2ttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2MTEzMTEsImV4cCI6MjA5MzE4NzMxMX0.ABSpFA2AXhaMdJpGnFCCIsIWRtSOc9pN14HuNcCiCSI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin() {
  console.log('Attempting to log in as mentor...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'nischay@theboringpeople.in',
    password: 'password123'
  });

  if (authError) {
    console.error('Login failed:', authError.message);
    return;
  }

  console.log('Login successful. User ID:', authData.user.id);
  
  console.log('Checking public.users profile...');
  const { data: profileData, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (profileError) {
    console.error('Profile fetch failed:', profileError.message);
  } else {
    console.log('Profile found:', profileData);
  }
}

testLogin();
