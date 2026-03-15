
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkColumn() {
  const { data, error } = await supabase
    .from('banners')
    .select('description')
    .limit(1);

  if (error) {
    if (error.code === '42703') {
      console.log('COLUMN_MISSING');
    } else {
      console.error('Error checking column:', error);
    }
  } else {
    console.log('COLUMN_EXISTS');
  }
}

checkColumn();
