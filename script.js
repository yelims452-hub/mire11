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

// 홈 페이지에는 좋아요가 가장 많은(랭킹 1~3위) 레시피 3개를 보여준다.
// Supabase가 연결되어 있으면 실제 좋아요 수 기준으로 집계하고(ranking.js와 동일한 방식),
// 없으면 recipes.json 기본값으로 폴백한다. 카드를 누르면 해당 레시피 상세(recipe.html)로 바로 이동한다.
async function loadHomeRecipes() {
  const grid = document.getElementById('recipe-grid');
  if (!grid) return;

  function renderCards(recipes) {
    if (!recipes.length) {
      grid.innerHTML = '<p class="recipe-loading">아직 등록된 레시피가 없어요.</p>';
      return;
    }
    grid.innerHTML = recipes.slice(0, 3).map((r, i) => `
      <a class="recipe-card${i === 0 ? ' featured-card' : ''}" href="${r.id ? `recipe.html?id=${encodeURIComponent(r.id)}` : 'feed.html'}">
        <img src="${r.image || (r.media && r.media[0]) || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=900&q=85'}" alt="${r.recipe_name}" loading="lazy" />
        <div class="card-body">
          <p>${(r.category || '').toUpperCase()}${r.duration ? ' · ' + r.duration : ''}</p>
          <h3>${r.recipe_name}</h3>
          <span>by. ${r.author || '익명의 요리사'}</span>
        </div>
      </a>
    `).join('');
  }

  try {
    const supabase = await window.getSupabase?.();
    if (supabase) {
      const { data: recipes, error } = await supabase
        .from('recipes')
        .select('*, likes(count)')
        .eq('hidden', false);
      if (error) throw error;

      const topRecipes = (recipes || [])
        .map((r) => ({ ...r, like_count: r.likes?.[0]?.count ?? 0 }))
        .sort((a, b) => b.like_count - a.like_count)
        .slice(0, 3);

      if (topRecipes.length) {
        renderCards(topRecipes);
        return;
      }
    }

    // Supabase 미연결이거나 등록된 레시피가 없으면 기본 예시 데이터로 폴백한다.
    const res = await fetch('recipes.json', { cache: 'no-store' });
    const seeded = await res.json();
    renderCards(Array.isArray(seeded) ? seeded : []);
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