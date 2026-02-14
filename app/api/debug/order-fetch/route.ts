import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
    const supabase = await createClient();
    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Missing id' });

    const results: any = {};

    // 1. Basic Order
    const { data: basic, error: basicError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();
    results.basic = { data: basic, error: basicError };

    // 2. Order + Profile
    const { data: withProfile, error: profileError } = await supabase
        .from('orders')
        .select('*, profiles(*)')
        .eq('id', id)
        .single();
    results.withProfile = { data: withProfile, error: profileError };

    // 3. Order + Address
    const { data: withAddress, error: addressError } = await supabase
        .from('orders')
        .select('*, shipping_address:addresses(*)')
        .eq('id', id)
        .single();
    results.withAddress = { data: withAddress, error: addressError };

    // 4. Order + Items
    const { data: withItems, error: itemsError } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', id)
        .single();
    results.withItems = { data: withItems, error: itemsError };

    // 5. Full Query
    const { data: full, error: fullError } = await supabase
        .from('orders')
        .select(`
      *,
      profiles (full_name, email, phone),
      shipping_address:addresses (*),
      order_items (
        *,
        product:products (name, image_url),
        variant:product_variants (size, color)
      )
    `)
        .eq('id', id)
        .single();
    results.full = { data: full, error: fullError };

    return NextResponse.json(results);
}
