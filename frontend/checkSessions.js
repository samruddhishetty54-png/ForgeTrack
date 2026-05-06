import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gbvoyzjebhxbjxrqfkkm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdidm95emplYmh4Ymp4cnFma2ttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2MTEzMTEsImV4cCI6MjA5MzE4NzMxMX0.ABSpFA2AXhaMdJpGnFCCIsIWRtSOc9pN14HuNcCiCSI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSessions() {
  const { count, error } = await supabase.from('sessions').select('*', { count: 'exact', head: true });
  if (error) {
    console.error('Error fetching sessions count:', error.message);
  } else {
    console.log(`--- SESSIONS COUNT: ${count} ---`);
  }
}

checkSessions();
