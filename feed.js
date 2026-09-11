const grid = document.getElementById('feed-grid');
const categoryFilter = document.getElementById('category-filter');
let allRecipes = [];
let activeCategory = '전체';

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function cardTemplate(r) {
  const img = r.image || (r.media && r.media[0]) || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=900&q=85';
  return `
    <a class="feed-card" href="recipe.html?id=${encodeURIComponent(r.id)}">
      <img src="${img}" alt="${escapeHtml(r.recipe_name)}" loading="lazy" />
      <div class="fc-body">
        <span class="fc-cat">${(r.category || '').toUpperCase()}${r.duration ? ' · ' + r.duration : ''}</span>
        <h3>${escapeHtml(r.recipe_name)}</h3>
        <span class="fc-author">by. ${escapeHtml(r.author || '익명의 요리사')}</span>
        <div class="fc-meta">
          <span>♥ ${r.like_count ?? r.likes ?? 0}</span>
          <span>💬 ${r.comment_count ?? 0}</span>
        </div>
      </div>
    </a>
  `;
}

function renderGrid() {
  const filtered = activeCategory === '전체'
    ? allRecipes
    : allRecipes.filter((r) => r.category === activeCategory);

  if (filtered.length === 0) {
    grid.innerHTML = `<p class="recipe-loading">${activeCategory === '전체' ? '아직 등록된 레시피가 없어요. 첫 레시피를 올려보세요!' : '이 카테고리에는 아직 레시피가 없어요.'}</p>`;
    return;
  }
  grid.innerHTML = filtered.map(cardTemplate).join('');
}

categoryFilter?.addEventListener('click', (e) => {
  const btn = e.target.closest('.cat-chip');
  if (!btn) return;
  activeCategory = btn.dataset.category;
  [...categoryFilter.querySelectorAll('.cat-chip')].forEach((c) => c.classList.toggle('active', c === btn));
  renderGrid();
});

async function loadFeed() {
  try {
    const supabase = await window.getSupabase?.();

    if (supabase) {
      const { data, error } = await supabase
        .from('recipes')
        .select('*, likes(count), comments(count)')
        .eq('hidden', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      allRecipes = (data || []).map((r) => ({
        ...r,
        like_count: r.likes?.[0]?.count ?? 0,
        comment_count: r.comments?.[0]?.count ?? 0,
      }));
    } else {
      // Supabase 미연결: 기본 예시 레시피(recipes.json) + 로컬 임시 저장분 표시
      const base = await fetch('recipes.json', { cache: 'no-store' }).then((res) => res.json()).catch(() => []);
      const local = JSON.parse(localStorage.getItem('local_recipes') || '[]');
      allRecipes = [...local, ...base.map((r, i) => ({ ...r, id: 'seed-' + i }))];
    }

    renderGrid();
  } catch (err) {
    console.error(err);
    grid.innerHTML = '<p class="recipe-loading">레시피를 불러오지 못했어요.</p>';
  }
}

loadFeed();
