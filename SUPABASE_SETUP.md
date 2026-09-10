# Supabase 연동 가이드

이 사이트가 "모두에게 보이는" 레시피 공유 + 좋아요 + 댓글 기능을 쓰려면 Supabase 프로젝트가 필요합니다.

## 1. Supabase 프로젝트 만들기
1. https://supabase.com 접속 후 로그인, **New project** 생성
2. 프로젝트 생성 후 좌측 **SQL Editor** 로 이동
3. 이 저장소의 `supabase-schema.sql` 내용을 붙여넣고 **Run** 실행
   - `recipes`, `likes`, `comments` 테이블과 `recipe-media` 스토리지 버킷이 생성됩니다.

## 2. API 키 확인
1. 좌측 메뉴 **Project Settings > API**
2. **Project URL** 과 **anon public key** 복사

## 3. 사이트에 연결
`supabase.js` 파일을 열어 아래 두 값을 교체하세요.

```js
const SUPABASE_URL = 'https://xxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOi...';
```

저장 후 GitHub에 반영하면, 다음부터 `create.html`에서 올린 레시피가 실제로 `feed.html`(모든 방문자)에게 보이고, 좋아요/댓글도 실시간으로 저장됩니다.

## 4. 연동 전 동작 방식
- `supabase.js`가 기본값(`YOUR_SUPABASE_URL`) 상태이면, 사이트는 자동으로 **로컬 임시 모드**로 동작합니다.
- 이 모드에서는 작성한 레시피/좋아요/댓글이 **내 브라우저(localStorage)에만** 저장되고 다른 사람에게는 보이지 않습니다.
- 위 설정을 완료하면 즉시 전체 공개 모드로 전환됩니다.
