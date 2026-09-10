const main = document.getElementById('profile-main');
const logoutLink = document.getElementById('logout-link');

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function renderProfile({ profile }) {
  main.innerHTML = `
    <div class="auth-card">
      <p class="section-kicker">MY PROFILE</p>
      <div class="profile-view">
        <div>
          <span class="p-username">@${escapeHtml(profile.username)}</span>
          <h2>${escapeHtml(profile.username)}님의 프로필</h2>
        </div>
        <dl>
          <dt>아이디</dt><dd>${escapeHtml(profile.username)}</dd>
          <dt>생년월일</dt><dd>${profile.birthdate ? escapeHtml(profile.birthdate) : '등록 안 함'}</dd>
          <dt>자기소개</dt><dd>${profile.bio ? escapeHtml(profile.bio) : '등록 안 함'}</dd>
        </dl>
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
