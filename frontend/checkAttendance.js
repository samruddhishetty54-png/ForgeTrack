import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gbvoyzjebhxbjxrqfkkm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdidm95emplYmh4Ymp4cnFma2ttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2MTEzMTEsImV4cCI6MjA5MzE4NzMxMX0.ABSpFA2AXhaMdJpGnFCCIsIWRtSOc9pN14HuNcCiCSI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAttendance() {
  const { count, error } = await supabase.from('attendance').select('*', { count: 'exact', head: true });
  if (error) {
    console.error('Error fetching attendance count:', error.message);
  } else {
    console.log(`--- ATTENDANCE COUNT: ${count} ---`);
  }

  const { data: sample, error: err2 } = await supabase.from('attendance').select('*, students(name, usn)').limit(1);
  if (err2) {
    console.error('Error fetching sample:', err2.message);
  } else {
    console.log('Sample:', JSON.stringify(sample, null, 2));
  }
}

checkAttendance();
