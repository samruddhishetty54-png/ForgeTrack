const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
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
