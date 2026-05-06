import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gbvoyzjebhxbjxrqfkkm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdidm95emplYmh4Ymp4cnFma2ttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2MTEzMTEsImV4cCI6MjA5MzE4NzMxMX0.ABSpFA2AXhaMdJpGnFCCIsIWRtSOc9pN14HuNcCiCSI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  console.log('--- STARTING AUTH DIAGNOSTICS ---');

  // 1. Check database connection
  console.log('\n1. Checking public tables connection...');
  const { count: studentCount, error: dbErr } = await supabase.from('students').select('*', { count: 'exact', head: true });
  if (dbErr) {
    console.error('❌ Database connection failed:', dbErr.message);
  } else {
    console.log(`✅ Database connected. Found ${studentCount || 0} students.`);
  }

  // 2. Test Login
  const testEmail = '4sh24cs001@example.com';
  const testPassword = '4SH24CS001';
  console.log(`\n2. Attempting login for ${testEmail}...`);
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  });

  if (error) {
    console.error('❌ Login Failed!');
    console.error(`Status: ${error.status}`);
    console.error(`Message: ${error.message}`);
    console.error(`Code: ${error.code}`);
  } else {
    console.log('✅ Login Succeeded!');
    console.log(`User ID: ${data.user.id}`);
    console.log(`Role: ${data.user.role}`);
  }
}

runTest();
