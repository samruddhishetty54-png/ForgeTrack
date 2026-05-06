import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gbvoyzjebhxbjxrqfkkm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdidm95emplYmh4Ymp4cnFma2ttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2MTEzMTEsImV4cCI6MjA5MzE4NzMxMX0.ABSpFA2AXhaMdJpGnFCCIsIWRtSOc9pN14HuNcCiCSI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLogs() {
  console.log('Fetching database SQL error logs...');
  const { data, error } = await supabase.from('debug_logs').select('*').order('created_at', { ascending: false });
  
  if (error) {
    console.error('Failed to fetch logs:', error.message);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('No SQL errors found! The script executed perfectly.');
  } else {
    console.log(`Found ${data.length} SQL errors:\n`);
    data.forEach(log => {
      console.log(`[${log.created_at}]`);
      console.log(`${log.error_message}\n---------------------`);
    });
  }
}

checkLogs();
