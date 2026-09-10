-- Recipe to World - Supabase 스키마
-- Supabase 프로젝트 SQL Editor에서 그대로 실행하세요.

create extension if not exists "uuid-ossp";

-- 레시피 테이블
create table if not exists recipes (
  id uuid primary key default uuid_generate_v4(),
  recipe_name text not null,
  category text,
  duration text,
  author text not null,
  tags text[] default '{}',
  ingredients jsonb not null default '[]',
  instructions jsonb not null default '[]',
  tips text,
  image text,
  media text[] default '{}',
  source_url text,
  created_at timestamptz default now()
);

-- 좋아요 테이블 (device_id 기준, 로그인 없이도 중복 방지)
create table if not exists likes (
  id uuid primary key default uuid_generate_v4(),
  recipe_id uuid references recipes(id) on delete cascade,
  device_id text not null,
  created_at timestamptz default now(),
  unique (recipe_id, device_id)
);

-- 댓글 테이블
create table if not exists comments (
  id uuid primary key default uuid_generate_v4(),
  recipe_id uuid references recipes(id) on delete cascade,
  author text not null,
  content text not null,
  device_id text,
  created_at timestamptz default now()
);

-- RLS 활성화 + 익명 사용자도 읽기/쓰기 가능하게 설정
-- (로그인 기능이 없는 오픈 SNS 형태이므로 anon 키로 insert/select 허용)
alter table recipes enable row level security;
alter table likes enable row level security;
alter table comments enable row level security;

create policy "recipes_select_all" on recipes for select using (true);
create policy "recipes_insert_all" on recipes for insert with check (true);

create policy "likes_select_all" on likes for select using (true);
create policy "likes_insert_all" on likes for insert with check (true);
create policy "likes_delete_own" on likes for delete using (true);

create policy "comments_select_all" on comments for select using (true);
create policy "comments_insert_all" on comments for insert with check (true);

-- Storage 버킷: recipe-media (Dashboard > Storage 에서도 생성 가능)
insert into storage.buckets (id, name, public)
values ('recipe-media', 'recipe-media', true)
on conflict (id) do nothing;

create policy "recipe_media_public_read" on storage.objects
  for select using (bucket_id = 'recipe-media');

create policy "recipe_media_public_upload" on storage.objects
  for insert with check (bucket_id = 'recipe-media');
