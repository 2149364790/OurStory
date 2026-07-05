-- Create love_contract table
create table if not exists public.love_contract (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  signed_at timestamp with time zone,
  groom_signature text, -- base64 signature image
  groom_signed_at timestamp with time zone,
  bride_signature text, -- base64 signature image
  bride_signed_at timestamp with time zone,
  status text default 'draft'::text not null
);

-- Enable RLS
alter table public.love_contract enable row level security;

-- Policies for RLS
create policy "Allow authenticated users to read contract" on public.love_contract
  for select using (auth.role() = 'authenticated');

create policy "Allow authenticated users to insert/update contract" on public.love_contract
  for all using (auth.role() = 'authenticated');

-- Insert default draft record if none exists
insert into public.love_contract (id, status)
values ('00000000-0000-0000-0000-000000000000', 'draft')
on conflict (id) do nothing;
