-- Recipe to World - 회원 프로필 스키마 (Supabase Auth 연동)
-- SQL Editor에서 실행하세요. (supabase-schema.sql을 먼저 실행했다는 전제)

-- 프로필 테이블: 아이디(username)는 유일해야 하고, auth.users와 1:1 연결
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  birthdate date,
  bio text,
  created_at timestamptz default now()
);

-- username 중복 체크를 빠르게 하기 위한 인덱스 (unique 제약이 이미 인덱스를 만들지만 대소문자 무시용으로 별도 추가)
create unique index if not exists profiles_username_lower_idx on profiles (lower(username));

alter table profiles enable row level security;

-- 누구나 프로필을 읽을 수 있음(작성자 표시, 공개 프로필 페이지용)
create policy "profiles_select_all" on profiles for select using (true);

-- 본인만 자신의 프로필을 수정 가능
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

-- 본인만 자신의 프로필을 생성 가능 (회원가입 시)
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);

-- recipes 테이블에 작성자 계정 연결 컬럼 추가 (기존 author 텍스트 필드는 유지, 익명 게시물 호환)
alter table recipes add column if not exists user_id uuid references auth.users(id) on delete set null;

-- comments 테이블에도 작성자 계정 연결 (선택)
alter table comments add column if not exists user_id uuid references auth.users(id) on delete set null;
