import { supabase } from '../src/lib/supabase.js';

async function check() {
  console.log('Checking database...');
  const { data: students, error: e1 } = await supabase.from('students').select('*');
  const { data: users, error: e2 } = await supabase.from('users').select('*');
  
  console.log('Students count:', students?.length);
  console.log('Users count:', users?.length);
  
  if (e1 || e2) console.error('Errors:', { e1, e2 });
}

check();
