const main = document.getElementById('profile-main');
const logoutLink = document.getElementById('logout-link');

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function renderProfile({ profile }) {
  const avatarUrl = profile.avatar_url || 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=200&q=80';
  main.innerHTML = `
    <div class="auth-card">
      <p class="section-kicker">MY PROFILE</p>
      <div class="profile-view">
        <div class="profile-header-row">
          <label class="avatar-upload" for="avatar-input">
            <img id="avatar-preview" src="${avatarUrl}" alt="프로필 사진" />
            <span class="avatar-upload-hint">사진 변경</span>
          </label>
          <input id="avatar-input" type="file" accept="image/*" hidden />
          <div>
            <span class="p-username">@${escapeHtml(profile.username)}</span>
            <h2>${escapeHtml(profile.username)}님의 프로필</h2>
          </div>
        </div>
        <dl>
          <dt>아이디</dt><dd>${escapeHtml(profile.username)}</dd>
          <dt>생년월일</dt><dd>${profile.birthdate ? escapeHtml(profile.birthdate) : '등록 안 함'}</dd>
          <dt>자기소개</dt><dd>${profile.bio ? escapeHtml(profile.bio) : '등록 안 함'}</dd>
        </dl>
        <p id="avatar-message" class="form-message" role="status"></p>
        <button type="button" class="button button-text small profile-edit-toggle" id="edit-toggle">프로필 수정하기</button>
      </div>

      <form id="edit-form" class="recipe-form" hidden style="margin-top:24px">
        <section class="form-block">
          <label for="edit-birthdate">생년월일</label>
          <input id="edit-birthdate" type="date" value="${profile.birthdate || ''}" />

          <label for="edit-bio">자기소개</label>
          <textarea id="edit-bio" rows="3">${escapeHtml(profile.bio || '')}</textarea>
        </section>
        <div id="edit-message" class="form-message" role="status"></div>
        <div class="form-actions">
          <button type="submit" class="button button-primary">저장하기 <span>→</span></button>
        </div>
      </form>
    </div>
  `;

  document.getElementById('edit-toggle').addEventListener('click', () => {
    const form = document.getElementById('edit-form');
    form.hidden = !form.hidden;
  });

  document.getElementById('avatar-input').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const avatarMessage = document.getElementById('avatar-message');
    avatarMessage.textContent = '업로드 중...';
    avatarMessage.className = 'form-message';
    try {
      const supabase = await window.getSupabase?.();
      const path = `avatars/${profile.id}-${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('recipe-media').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('recipe-media').getPublicUrl(path);
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', profile.id);
      if (updateError) throw updateError;
      document.getElementById('avatar-preview').src = data.publicUrl;
      avatarMessage.textContent = '프로필 사진을 바꿈었어요!';
      avatarMessage.className = 'form-message success';
    } catch (err) {
      avatarMessage.textContent = '업로드 실패: ' + (err.message || err);
      avatarMessage.className = 'form-message error';
    }
  });

  document.getElementById('edit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const editMessage = document.getElementById('edit-message');
    const supabase = await window.getSupabase?.();
    const birthdate = document.getElementById('edit-birthdate').value || null;
    const bio = document.getElementById('edit-bio').value.trim() || null;

    const { error } = await supabase.from('profiles').update({ birthdate, bio }).eq('id', profile.id);
    if (error) {
      editMessage.textContent = '저장 중 문제가 발생했어요: ' + error.message;
      editMessage.className = 'form-message error';
      return;
    }
    editMessage.textContent = '저장했어요!';
    editMessage.className = 'form-message success';
    setTimeout(() => main.dispatchEvent(new Event('reload')), 800);
  });

  loadMyRecipes(profile.id);
}

function myRecipeItemTemplate(r) {
  return `
    <div class="my-recipe-item">
      ${window.recipeThumbHtml(r, { alt: escapeHtml(r.recipe_name) })}
      <div class="my-recipe-info">
        <h3>${escapeHtml(r.recipe_name)}${r.hidden ? ' <span class="rd-hidden-badge">비공개</span>' : ''}</h3>
        <span>♥ ${r.likes?.[0]?.count ?? 0}</span>
      </div>
      <div class="my-recipe-actions">
        <a class="button button-text small" href="recipe.html?id=${r.id}">보기</a>
        <a class="button button-text small" href="edit-recipe.html?id=${r.id}">수정</a>
      </div>
    </div>
  `;
}

async function loadMyRecipes(userId) {
  const container = document.createElement('div');
  container.className = 'auth-card';
  container.style.marginTop = '24px';
  container.innerHTML = '<p class="section-kicker">MY RECIPES</p><div id="my-recipe-list" class="my-recipe-list"><p class="recipe-loading">불러오는 중...</p></div>';
  main.appendChild(container);

  const supabase = await window.getSupabase?.();
  const { data, error } = await supabase
    .from('recipes')
    .select('*, likes(count)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const listEl = document.getElementById('my-recipe-list');
  if (error) {
    listEl.innerHTML = '<p class="recipe-loading">레시피를 불러오지 못했어요.</p>';
    return;
  }
  if (!data || data.length === 0) {
    listEl.innerHTML = '<p class="recipe-loading">아직 작성한 레시피가 없어요.</p>';
    return;
  }
  listEl.innerHTML = data.map(myRecipeItemTemplate).join('');
}

async function main_load() {
  const current = await window.RecipeAuth.getCurrentUser();
  if (!current || !current.profile) {
    main.innerHTML = `
      <div class="auth-card">
        <p class="section-kicker">MY PROFILE</p>
        <h1>로그인이 필요해요.</h1>
        <p class="create-page-sub">프로필을 보려면 먼저 로그인해주세요.</p>
        <div class="form-actions" style="justify-content:flex-start;gap:14px">
          <a class="button button-primary" href="login.html">로그인하기 <span>→</span></a>
          <a class="button button-text" href="signup.html">회원가입하기 <span>→</span></a>
        </div>
      </div>
    `;
    logoutLink.style.display = 'none';
    return;
  }
  renderProfile(current);
}

main.addEventListener('reload', main_load);

logoutLink.addEventListener('click', async (e) => {
  e.preventDefault();
  await window.RecipeAuth.signOut();
  window.location.href = 'index.html';
});

main_load();
