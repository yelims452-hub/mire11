const list = document.getElementById('ranking-list');

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function rankItemTemplate(r, i) {
  return `
    <a class="rank-item" href="recipe.html?id=${encodeURIComponent(r.id)}">
      <span class="rank-num">${i + 1}</span>
      ${window.recipeThumbHtml(r, { alt: escapeHtml(r.recipe_name), extraClass: 'rank-thumb' })}
      <div class="rank-info">
        <h3>${escapeHtml(r.recipe_name)}</h3>
        <span>${(r.category || '').toUpperCase()} · by. ${escapeHtml(r.author || '익명의 요리사')}</span>
      </div>
      <span class="rank-likes">♥ ${r.like_count ?? 0}</span>
    </a>
  `;
}

async function loadRanking() {
  try {
    const supabase = await window.getSupabase?.();
    if (!supabase) {
      list.innerHTML = '<p class="recipe-loading">랭킹을 보려면 Supabase 연결이 필요해요.</p>';
      return;
    }

    const { data: recipes, error } = await supabase.from('recipes').select('*, likes(count)').eq('hidden', false);
    if (error) throw error;

    const withCounts = (recipes || [])
      .map((r) => ({ ...r, like_count: r.likes?.[0]?.count ?? 0 }))
      .sort((a, b) => b.like_count - a.like_count)
      .slice(0, 30);

    if (withCounts.length === 0) {
      list.innerHTML = '<p class="recipe-loading">아직 레시피가 없어요.</p>';
      return;
    }

    list.innerHTML = withCounts.map(rankItemTemplate).join('');
  } catch (err) {
    console.error(err);
    list.innerHTML = '<p class="recipe-loading">랭킹을 불러오지 못했어요.</p>';
  }
}

loadRanking();
