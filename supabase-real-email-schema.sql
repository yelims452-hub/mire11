-- 실제 이메일 인증 + 가입 속도 제한 지원을 위한 스키마
-- SQL Editor에서 실행하세요.

-- 1) profiles에 실제 이메일 컬럼 추가 (로그인 시 아이디->이메일 조회에 사용)
alter table profiles add column if not exists email text;
create unique index if not exists profiles_email_unique_idx on profiles (lower(email));

-- 2) 가입 속도 제한을 위한 시도 기록 테이블 (IP당 최근 가입 시각 기록)
create table if not exists signup_attempts (
  id bigint generated always as identity primary key,
  ip_address text not null,
  created_at timestamptz default now()
);

create index if not exists signup_attempts_ip_time_idx on signup_attempts (ip_address, created_at desc);

alter table signup_attempts enable row level security;

-- service_role만 접근 가능하도록 별도 정책 없음 (RLS 기본값: 아무 정책도 없으면 anon 접근 차단됨)
-- 서버(api/check-signup-limit.js)는 service_role 키로 접근하므로 RLS를 우회한다.
