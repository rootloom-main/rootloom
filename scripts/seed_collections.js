const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables. Ensure .env.local has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedCollections() {
  console.log('🚀 Starting collection seed...');

  const collections = [
    {
      name: 'Fresh Drops 2026',
      slug: 'fresh-drops',
      description: 'The latest heist from the urban jungle. Pure drip, limited supply.',
      is_active: true,
    },
    {
      name: 'Best Sellers // Hype List',
      slug: 'best-sellers',
      description: 'The pieces everyone is talking about. Re-up pending.',
      is_active: true,
    },
    {
      name: 'Summer Solstice // 26',
      slug: 'summer-sale',
      description: 'High voltage vibes for the solar season. 20% OFF selected drip.',
      is_active: true,
    }
  ];

  for (const collection of collections) {
    console.log(`📦 Seeding collection: ${collection.name}...`);
    
    const { data: existing } = await supabase
      .from('collections')
      .select('id')
      .eq('slug', collection.slug)
      .single();

    if (existing) {
      console.log(`⏩ Collection "${collection.slug}" already exists, skipping.`);
      continue;
    }

    const { data, error } = await supabase
      .from('collections')
      .insert(collection)
      .select()
      .single();

    if (error) {
      console.error(`❌ Error seeding ${collection.name}:`, error.message);
    } else {
      console.log(`✅ Seeded ${collection.name} (ID: ${data.id})`);
      
      // Assign some random products to this collection
      const { data: products } = await supabase
        .from('products')
        .select('id')
        .is('deleted_at', null)
        .limit(5);

      if (products && products.length > 0) {
        const mappings = products.map((p, index) => ({
          collection_id: data.id,
          product_id: p.id,
          display_order: index
        }));

        const { error: mapError } = await supabase
          .from('collection_products')
          .insert(mappings);

        if (mapError) {
          console.error(`❌ Error mapping products to ${collection.name}:`, mapError.message);
        } else {
          console.log(`🔗 Linked ${products.length} products to ${collection.name}`);
        }
      }
    }
  }

  console.log('✨ Seed complete!');
}

seedCollections();
