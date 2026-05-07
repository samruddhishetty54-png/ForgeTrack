const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../frontend/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkData() {
  console.log('Checking database counts...');
  
  try {
    const { count: students, error: e1 } = await supabase.from('students').select('*', { count: 'exact', head: true });
    const { count: sessions, error: e2 } = await supabase.from('sessions').select('*', { count: 'exact', head: true });
    const { count: attendance, error: e3 } = await supabase.from('attendance').select('*', { count: 'exact', head: true });
    const { count: users, error: e4 } = await supabase.from('users').select('*', { count: 'exact', head: true });

    if (e1 || e2 || e3 || e4) {
      console.error('Errors:', { e1, e2, e3, e4 });
    }

    console.log('Students:', students);
    console.log('Sessions:', sessions);
    console.log('Attendance:', attendance);
    console.log('Users (Public):', users);
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkData();
