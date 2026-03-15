
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production' });

async function checkCollections() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data, error } = await supabase
    .from('collections')
    .select('id, name, slug, is_active, start_date, end_date');

  console.log('Collections:', data);
  if (error) console.error('Error:', error);
}

checkCollections();
