-- Saved hailstone orbits and published proofs (per-user).
create table if not exists profiles (
  user_id text primary key,
  display_name text not null,
  updated_at timestamptz not null default now()
);

create table if not exists orbits (
  id serial primary key,
  user_id text not null,
  start_n text not null,
  steps integer not null,
  peak text not null,
  reached_one boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists orbits_user_n_idx on orbits (user_id, start_n);
create index if not exists orbits_user_id_idx on orbits (user_id);

create table if not exists shares (
  id serial primary key,
  user_id text not null,
  slug text not null unique,
  byline text not null,
  start_n text,
  steps integer,
  peak text,
  reached_one boolean,
  created_at timestamptz not null default now()
);
create index if not exists shares_user_id_idx on shares (user_id);
