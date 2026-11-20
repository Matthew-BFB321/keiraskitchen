-- Keira's Kitchen: recipes table (one row per recipe).
-- Run once in the Supabase dashboard: SQL Editor > New query > paste > Run.
-- Safe to read top to bottom; nothing here touches existing data.

-- 1. Table ------------------------------------------------------------------
create table public.recipes (
  id uuid primary key,                         -- the app's recipe UUID
  user_id uuid not null default auth.uid()     -- filled in from the login
    references auth.users (id) on delete cascade,
  schema_version int not null default 1,       -- shape of `data`, for future migrations
  title text not null,
  data jsonb not null,                         -- description, servings, prepMin, cookMin, tags,
                                               -- ingredients, steps, notes, source, photoUrl
  is_favourite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index recipes_user_id_idx on public.recipes (user_id);

-- 2. Keep updated_at current ------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger recipes_set_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

-- 3. Row level security: each user sees and changes only their own recipes --
alter table public.recipes enable row level security;

create policy "Users can read their own recipes"
  on public.recipes for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add their own recipes"
  on public.recipes for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can change their own recipes"
  on public.recipes for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own recipes"
  on public.recipes for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- 4. Data API access: logged-in users only (RLS above still applies) --------
revoke all on public.recipes from anon;
grant select, insert, update, delete on public.recipes to authenticated;
