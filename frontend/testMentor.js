import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gbvoyzjebhxbjxrqfkkm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdidm95emplYmh4Ymp4cnFma2ttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2MTEzMTEsImV4cCI6MjA5MzE4NzMxMX0.ABSpFA2AXhaMdJpGnFCCIsIWRtSOc9pN14HuNcCiCSI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  console.log('Trying Mentor Login: nischay@theboringpeople.in / password123');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'nischay@theboringpeople.in',
    password: 'password123'
  });
  if (error) {
    console.log(`❌ Failed: ${error.message}`);
  } else {
    console.log(`✅ SUCCESS! User ID: ${data.user.id}`);
  }
}

runTest();
