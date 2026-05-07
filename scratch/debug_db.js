const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'frontend/.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function debugData() {
  const { data: students, count: totalStudents } = await supabase
    .from('students')
    .select('*', { count: 'exact' });
  
  console.log('--- DATABASE DEBUG ---');
  console.log('Total Students in DB:', totalStudents);
  if (students && students.length > 0) {
    console.log('Names of students found:', students.map(s => s.name).join(', '));
  } else {
    console.log('No students found in DB.');
  }
}

debugData();
