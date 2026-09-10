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

document.querySelector('.publish-button')?.addEventListener('click', () => {
  const original = '첫 레시피 작성하기 →';
  document.querySelector('.publish-button').textContent = '레시피 작성 화면을 준비 중이에요!';
  setTimeout(() => { document.querySelector('.publish-button').textContent = original; }, 2400);
});

// 레시피 카드를 recipes.json에서 불러와 렌더링한다.
async function loadRecipes() {
  const grid = document.getElementById('recipe-grid');
  if (!grid) return;
  try {
    const res = await fetch('recipes.json', { cache: 'no-store' });
    const recipes = await res.json();
    if (!Array.isArray(recipes) || recipes.length === 0) {
      grid.innerHTML = '<p class="recipe-loading">아직 등록된 레시피가 없어요.</p>';
      return;
    }
    grid.innerHTML = recipes.map((r, i) => `
      <article class="recipe-card${i === 0 ? ' featured-card' : ''}">
        <img src="${r.image || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=900&q=85'}" alt="${r.recipe_name}" loading="lazy" />
        <div class="card-body">
          <p>${(r.category || '').toUpperCase()}${r.duration ? ' · ' + r.duration : ''}</p>
          <h3>${r.recipe_name}</h3>
          <span>by. ${r.author || '익명의 요리사'}</span>
        </div>
      </article>
    `).join('');
  } catch (err) {
    grid.innerHTML = '<p class="recipe-loading">레시피를 불러오지 못했어요.</p>';
    console.error('레시피 로드 실패:', err);
  }
}

loadRecipes();
