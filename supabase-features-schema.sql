-- 6가지 신규 기능 지원을 위한 스키마 변경
-- SQL Editor에서 실행하세요.

-- 1) 프로필 사진
alter table profiles add column if not exists avatar_url text;

-- 2) 레시피 숨김 기능 (작성자 본인만 숨김/공개 전환 가능, RLS는 아래 정책 참고)
alter table recipes add column if not exists hidden boolean not null default false;

-- 3) recipes에 대한 수정/삭제 RLS 정책 (본인 소유만 가능)
-- 기존에 select/insert 정책만 있었다면 update/delete 정책을 추가한다.
drop policy if exists "recipes_update_own" on recipes;
create policy "recipes_update_own" on recipes for update using (auth.uid() = user_id);

drop policy if exists "recipes_delete_own" on recipes;
create policy "recipes_delete_own" on recipes for delete using (auth.uid() = user_id);

-- 참고: recipes_select_all 정책이 이미 있다면 hidden 여부와 무관하게 모두 select 가능하지만,
-- 프론트엔드(feed.js, ranking.js)에서 hidden=false 조건으로 필터링해 공개 목록에는 노출하지 않는다.
-- 작성자 본인은 recipe.html에서 자신의 hidden 레시피도 볼 수 있도록 프론트에서 별도 처리한다.
