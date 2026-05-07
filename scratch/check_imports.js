const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'frontend/.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkImportLogs() {
  const { data, error } = await supabase
    .from('import_log')
    .select('*')
    .order('uploaded_at', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Latest Import Logs:');
  console.log(JSON.stringify(data, null, 2));
}

checkImportLogs();
