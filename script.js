const menuButton = document.querySelector('.menu-button');
const nav = document.querySelector('.main-nav');

menuButton?.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  nav.classList.toggle('is-open', !isOpen);
});

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', () => nav?.classList.remove('is-open'));
});

// 홈 페이지에는 대표 레시피 3개만 간단히 미리보기로 보여준다(recipes.json 기반).
// 전체 목록/상세/좋아요/댓글은 feed.html, recipe.html에서 처리된다.
async function loadHomeRecipes() {
  const grid = document.getElementById('recipe-grid');
  if (!grid) return;
  try {
    const res = await fetch('recipes.json', { cache: 'no-store' });
    const recipes = await res.json();
    if (!Array.isArray(recipes) || recipes.length === 0) {
      grid.innerHTML = '<p class="recipe-loading">아직 등록된 레시피가 없어요.</p>';
      return;
    }
    grid.innerHTML = recipes.slice(0, 3).map((r, i) => `
      <a class="recipe-card${i === 0 ? ' featured-card' : ''}" href="feed.html">
        <img src="${r.image || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=900&q=85'}" alt="${r.recipe_name}" loading="lazy" />
        <div class="card-body">
          <p>${(r.category || '').toUpperCase()}${r.duration ? ' · ' + r.duration : ''}</p>
          <h3>${r.recipe_name}</h3>
          <span>by. ${r.author || '익명의 요리사'}</span>
        </div>
      </a>
    `).join('');
  } catch (err) {
    grid.innerHTML = '<p class="recipe-loading">레시피를 불러오지 못했어요.</p>';
    console.error('레시피 로드 실패:', err);
  }
}

loadHomeRecipes();

// 실제 가입자 수(profiles 테이블 row 개수)를 불러와 표시한다.
async function loadUserCount() {
  const badge = document.getElementById('user-count-badge');
  const text = document.getElementById('user-count-text');
  if (!badge || !text) return;
  try {
    const supabase = await window.getSupabase?.();
    if (!supabase) {
      text.textContent = '많은';
      badge.textContent = '★';
      return;
    }
    const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    if (error) throw error;
    const n = count || 0;
    text.textContent = n.toLocaleString('ko-KR') + '명';
    badge.textContent = n >= 1000 ? `+${Math.floor(n / 1000)}k` : `${n}`;
  } catch (err) {
    console.error('사용자 수 로드 실패:', err);
    text.textContent = '여러';
    badge.textContent = '★';
  }
}

loadUserCount();
