-- StickStory AI schema (PostgreSQL)

create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  slug text unique not null,
  title text not null,
  original_text text not null,
  expanded_story jsonb not null,
  timeline jsonb not null,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stories_is_public_created_at_idx on stories(is_public, created_at desc);
create index if not exists stories_slug_idx on stories(slug);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists stories_set_updated_at on stories;
create trigger stories_set_updated_at
before update on stories
for each row execute function set_updated_at();

