const container = document.getElementById('recipe-detail');
const params = new URLSearchParams(window.location.search);
const recipeId = params.get('id');

function getDeviceId() {
  let id = localStorage.getItem('device_id');
  if (!id) {
    id = 'dev-' + Math.random().toString(36).slice(2) + Date.now();
    localStorage.setItem('device_id', id);
  }
  return id;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderDetail(recipe, { likeCount, liked, comments }) {
  const media = (recipe.media && recipe.media.length ? recipe.media : [recipe.image]).filter(Boolean);
  container.innerHTML = `
    <div class="rd-header">
      <span class="rd-cat">${(recipe.category || '').toUpperCase()}${recipe.duration ? ' · ' + recipe.duration : ''}</span>
      <h1>${escapeHtml(recipe.recipe_name)}</h1>
      <div class="rd-meta">
        <span>by. ${escapeHtml(recipe.author || '익명의 요리사')}</span>
        ${recipe.created_at ? `<span>${new Date(recipe.created_at).toLocaleDateString('ko-KR')}</span>` : ''}
      </div>
    </div>

    ${media.length ? `<div class="rd-media">${media.map((url) =>
      /\.(mp4|webm|mov)(\?|$)/i.test(url)
        ? `<video src="${url}" controls></video>`
        : `<img src="${url}" alt="조리 과정 이미지" />`
    ).join('')}</div>` : ''}

    <div class="engage-bar">
      <button id="like-btn" class="like-button${liked ? ' liked' : ''}">
        <span class="heart">${liked ? '♥' : '♡'}</span> 좋아요 <span id="like-count">${likeCount}</span>
      </button>
    </div>

    <section class="rd-section">
      <h2>재료</h2>
      <ul class="rd-ingredients">
        ${(recipe.ingredients || []).map((i) => `<li>${escapeHtml(i.name)} ${i.amount ? `<b>${escapeHtml(i.amount)}</b>` : ''}</li>`).join('')}
      </ul>
    </section>

    <section class="rd-section">
      <h2>조리 순서</h2>
      <ol class="rd-steps">
        ${(recipe.instructions || []).map((s) => `<li>${escapeHtml(s)}</li>`).join('')}
      </ol>
    </section>

    ${recipe.tips ? `<section class="rd-section"><h2>팁</h2><p class="rd-tips">${escapeHtml(recipe.tips)}</p></section>` : ''}

    ${recipe.tags?.length ? `<section class="rd-section"><h2>태그</h2><div class="rd-tags">${recipe.tags.map((t) => `<span>#${escapeHtml(t)}</span>`).join('')}</div></section>` : ''}

    <section class="rd-section">
      <h2>댓글 <span id="comment-count">${comments.length}</span></h2>
      <form id="comment-form" class="comment-form">
        <input type="text" id="comment-name" placeholder="닉네임" style="max-width:120px" required />
        <input type="text" id="comment-text" placeholder="댓글을 남겨보세요" required />
        <button type="submit">등록</button>
      </form>
      <div id="comment-list" class="comment-list">
        ${comments.length ? comments.map(commentTemplate).join('') : '<p class="comment-empty">아직 댓글이 없어요. 첫 댓글을 남겨보세요!</p>'}
      </div>
    </section>
  `;
}

function commentTemplate(c) {
  return `
    <div class="comment-item">
      <div class="comment-avatar">${escapeHtml((c.author || '?').slice(0, 1))}</div>
      <div class="comment-body">
        <b>${escapeHtml(c.author || '익명')}</b><time>${c.created_at ? new Date(c.created_at).toLocaleString('ko-KR') : ''}</time>
        <p>${escapeHtml(c.content)}</p>
      </div>
    </div>
  `;
}

async function main() {
  if (!recipeId) {
    container.innerHTML = '<p class="recipe-loading">레시피를 찾을 수 없어요.</p>';
    return;
  }
  const supabase = await window.getSupabase?.();
  const deviceId = getDeviceId();

  if (supabase && !recipeId.startsWith('seed-') && !recipeId.startsWith('local-')) {
    const { data: recipe, error } = await supabase.from('recipes').select('*').eq('id', recipeId).single();
    if (error || !recipe) {
      container.innerHTML = '<p class="recipe-loading">레시피를 불러오지 못했어요.</p>';
      return;
    }
    const { count: likeCount } = await supabase.from('likes').select('*', { count: 'exact', head: true }).eq('recipe_id', recipeId);
    const { data: myLike } = await supabase.from('likes').select('id').eq('recipe_id', recipeId).eq('device_id', deviceId).maybeSingle();
    const { data: comments } = await supabase.from('comments').select('*').eq('recipe_id', recipeId).order('created_at', { ascending: true });

    renderDetail(recipe, { likeCount: likeCount || 0, liked: !!myLike, comments: comments || [] });

    document.getElementById('like-btn').addEventListener('click', async () => {
      const btn = document.getElementById('like-btn');
      const isLiked = btn.classList.contains('liked');
      if (isLiked) {
        await supabase.from('likes').delete().eq('recipe_id', recipeId).eq('device_id', deviceId);
      } else {
        await supabase.from('likes').insert({ recipe_id: recipeId, device_id: deviceId });
      }
      main();
    });

    document.getElementById('comment-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const author = document.getElementById('comment-name').value.trim();
      const content = document.getElementById('comment-text').value.trim();
      if (!author || !content) return;
      await supabase.from('comments').insert({ recipe_id: recipeId, author, content, device_id: deviceId });
      main();
    });
  } else {
    // Supabase 미연결: 로컬/시드 데이터 기반 표시, 좋아요·댓글은 로컬에만 저장
    const local = JSON.parse(localStorage.getItem('local_recipes') || '[]');
    const base = await fetch('recipes.json', { cache: 'no-store' }).then((r) => r.json()).catch(() => []);
    const seeded = base.map((r, i) => ({ ...r, id: 'seed-' + i }));
    const recipe = [...local, ...seeded].find((r) => r.id === recipeId);
    if (!recipe) {
      container.innerHTML = '<p class="recipe-loading">레시피를 찾을 수 없어요.</p>';
      return;
    }
    const likesKey = 'likes_' + recipeId;
    const commentsKey = 'comments_' + recipeId;
    const liked = localStorage.getItem(likesKey) === '1';
    const likeCount = (recipe.likes || 0) + (liked ? 1 : 0);
    const comments = JSON.parse(localStorage.getItem(commentsKey) || '[]');

    renderDetail(recipe, { likeCount, liked, comments });

    document.getElementById('like-btn').addEventListener('click', () => {
      const nowLiked = localStorage.getItem(likesKey) === '1';
      localStorage.setItem(likesKey, nowLiked ? '0' : '1');
      main();
    });

    document.getElementById('comment-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const author = document.getElementById('comment-name').value.trim();
      const content = document.getElementById('comment-text').value.trim();
      if (!author || !content) return;
      const list = JSON.parse(localStorage.getItem(commentsKey) || '[]');
      list.push({ author, content, created_at: new Date().toISOString() });
      localStorage.setItem(commentsKey, JSON.stringify(list));
      main();
    });
  }
}

main();
