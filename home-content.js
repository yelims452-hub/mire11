// 홈페이지(index.html)의 핵심 텍스트를 Supabase home_content 테이블에서 불러와 반영한다.
// 관리자가 admin.html에서 값을 수정하면, 다음 방문부터 이 값이 그대로 표시된다.
// Supabase 미연결이거나 값이 없으면 HTML에 이미 적혀있는 기본 문구를 그대로 둔다.

const HOME_CONTENT_KEYS = [
  'hero_title',
  'hero_description',
  'story_title',
  'story_text_1',
  'story_text_2',
  'quote_card',
];

const KEY_TO_ELEMENT_ID = {
  hero_title: 'hero-title',
  hero_description: 'hero-description',
  story_title: 'story-title',
  story_text_1: 'story-text-1',
  story_text_2: 'story-text-2',
  quote_card: 'quote-card',
};

async function applyHomeContent() {
  const supabase = await window.getSupabase?.();
  if (!supabase) return;

  const { data, error } = await supabase
    .from('home_content')
    .select('key, value')
    .in('key', HOME_CONTENT_KEYS);

  if (error || !data) return;

  data.forEach(({ key, value }) => {
    const elId = KEY_TO_ELEMENT_ID[key];
    if (!elId) return;
    const el = document.getElementById(elId);
    if (el) el.innerHTML = value;
  });
}

applyHomeContent();