import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gbvoyzjebhxbjxrqfkkm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdidm95emplYmh4Ymp4cnFma2ttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2MTEzMTEsImV4cCI6MjA5MzE4NzMxMX0.ABSpFA2AXhaMdJpGnFCCIsIWRtSOc9pN14HuNcCiCSI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  const variations = [
    { email: '4sh24cs001@example.com', pass: '4SH24CS001' },
    { email: '4sh24cs001@example.com', pass: '4sh24cs001' },
    { email: '4SH24CS001@example.com', pass: '4SH24CS001' },
    { email: '4sh24cs001@forge.local', pass: '4SH24CS001' },
    { email: '4sh24cs001@forge.local', pass: '4sh24cs001' },
  ];

  for (const v of variations) {
    console.log(`Trying Login: ${v.email} / ${v.pass}`);
    const { error } = await supabase.auth.signInWithPassword({
      email: v.email,
      password: v.pass
    });
    if (error) {
      console.log(`❌ Failed: ${error.message}`);
    } else {
      console.log(`✅ SUCCESS!`);
      return;
    }
  }
}

runTest();
