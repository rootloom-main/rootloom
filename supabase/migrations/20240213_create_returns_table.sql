-- Create returns table
create table if not exists returns (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  order_id uuid references public.orders(id) not null,
  order_item_id uuid references public.order_items(id) not null,
  reason text not null,
  status text check (status in ('requested', 'approved', 'rejected', 'refunded')) default 'requested',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table returns enable row level security;

-- Policies
create policy "Users can view their own returns"
  on returns for select
  using (auth.uid() = user_id);

create policy "Users can create returns"
  on returns for insert
  with check (auth.uid() = user_id);

create policy "Admins can view all returns"
  on returns for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'superadmin')
    )
  );

create policy "Admins can update returns"
  on returns for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'superadmin')
    )
  );
