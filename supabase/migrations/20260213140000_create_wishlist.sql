create table if not exists wishlists (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  product_id uuid references products(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  unique(user_id, product_id)
);

alter table wishlists enable row level security;

create policy "Users can view their own wishlist"
  on wishlists for select
  using (auth.uid() = user_id);

create policy "Users can insert into their own wishlist"
  on wishlists for insert
  with check (auth.uid() = user_id);

create policy "Users can delete from their own wishlist"
  on wishlists for delete
  using (auth.uid() = user_id);
