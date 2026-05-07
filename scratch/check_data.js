import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../frontend/.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkData() {
  console.log('Checking database counts...');
  
  const { count: students } = await supabase.from('students').select('*', { count: 'exact', head: true });
  const { count: sessions } = await supabase.from('sessions').select('*', { count: 'exact', head: true });
  const { count: attendance } = await supabase.from('attendance').select('*', { count: 'exact', head: true });
  const { count: users } = await supabase.from('users').select('*', { count: 'exact', head: true });

  console.log('Students:', students);
  console.log('Sessions:', sessions);
  console.log('Attendance:', attendance);
  console.log('Users (Public):', users);
}

checkData();
