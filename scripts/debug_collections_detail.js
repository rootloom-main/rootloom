
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production' });

async function checkCollectionsDetail() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data, error } = await supabase
    .from('collections')
    .select('id, name, slug, type, rules');

  console.log('Collections Detail:', JSON.stringify(data, null, 2));
  if (error) console.error('Error:', error);
}

checkCollectionsDetail();
