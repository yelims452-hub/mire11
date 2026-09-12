// 관리자 전용 페이지: 로그인한 사용자의 profiles.is_admin이 true여야 접근 가능하다.
// 홈페이지(index.html)의 핵심 텍스트를 home_content 테이블에서 불러와 수정할 수 있게 해준다.
// 실제 저장은 RLS 정책(home_content_update_admin)이 is_admin을 다시 검증하므로 이중으로 안전하다.

const main = document.getElementById('admin-main');

const FIELDS = [
  { key: 'hero_title', label: '히어로 제목', type: 'text', hint: '<br />, <em>...</em> 같은 간단한 HTML 태그를 쓸 수 있어요.' },
  { key: 'hero_description', label: '히어로 설명', type: 'textarea' },
  { key: 'story_title', label: '이야기 섹션 제목', type: 'text', hint: '<br />, <em>...</em> 같은 간단한 HTML 태그를 쓸 수 있어요.' },
  { key: 'story_text_1', label: '이야기 문단 1', type: 'textarea' },
  { key: 'story_text_2', label: '이야기 문단 2', type: 'textarea' },
  { key: 'quote_card', label: '인용구 카드', type: 'textarea', hint: '<br /> 로 줄바꿈할 수 있어요.' },
];

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function renderForm(values) {
  main.innerHTML = `
    <div class="create-page-heading">
      <p class="section-kicker">ADMIN</p>
      <h1>홈페이지<br /><em>문구를 수정해요.</em></h1>
      <p class="create-page-sub">여기서 저장하면 첫 화면(index.html)에 바로 반영돼요.</p>
    </div>

    <form id="home-content-form" class="recipe-form" novalidate>
      <section class="form-block">
        ${FIELDS.map((f) => `
          <label for="field-${f.key}">${escapeHtml(f.label)}</label>
          ${f.hint ? `<p class="field-hint">${escapeHtml(f.hint)}</p>` : ''}
          ${f.type === 'textarea'
            ? `<textarea id="field-${f.key}" rows="3">${escapeHtml(values[f.key] || '')}</textarea>`
            : `<input id="field-${f.key}" type="text" value="${escapeHtml(values[f.key] || '')}" />`}
        `).join('')}
      </section>

      <div id="form-message" class="form-message" role="status"></div>

      <div class="form-actions">
        <button type="submit" class="button button-primary" id="submit-button">저장하기 <span>→</span></button>
      </div>
    </form>
  `;

  document.getElementById('home-content-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const messageBox = document.getElementById('form-message');
    const submitButton = document.getElementById('submit-button');
    messageBox.textContent = '';
    messageBox.className = 'form-message';
    submitButton.disabled = true;
    submitButton.textContent = '저장 중...';

    try {
      const supabase = await window.getSupabase?.();
      const updates = FIELDS.map((f) => ({
        key: f.key,
        value: document.getElementById(`field-${f.key}`).value,
      }));

      for (const { key, value } of updates) {
        const { error } = await supabase.from('home_content').update({ value }).eq('key', key);
        if (error) throw error;
      }

      messageBox.textContent = '저장했어요! 첫 화면에 반영됐어요.';
      messageBox.className = 'form-message success';
    } catch (err) {
      messageBox.textContent = '저장 중 문제가 발생했어요: ' + (err.message || err);
      messageBox.className = 'form-message error';
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = '저장하기 →';
    }
  });
}

async function main_load() {
  const current = await window.RecipeAuth?.getCurrentUser?.();
  if (!current || !current.profile) {
    main.innerHTML = `
      <div class="auth-card">
        <p class="section-kicker">ADMIN</p>
        <h1>로그인이 필요해요.</h1>
        <p class="create-page-sub">관리자 계정으로 로그인해주세요.</p>
        <div class="form-actions" style="justify-content:flex-start;gap:14px">
          <a class="button button-primary" href="login.html">로그인하기 <span>→</span></a>
        </div>
      </div>
    `;
    return;
  }

  if (!current.profile.is_admin) {
    main.innerHTML = `
      <div class="auth-card">
        <p class="section-kicker">ACCESS DENIED</p>
        <h1>관리자만 접근할 수 있어요.</h1>
        <p class="create-page-sub">이 계정은 관리자 권한이 없어요.</p>
      </div>
    `;
    return;
  }

  const supabase = await window.getSupabase?.();
  const { data, error } = await supabase.from('home_content').select('key, value');
  if (error) {
    main.innerHTML = '<p class="recipe-loading">홈 콘텐츠를 불러오지 못했어요.</p>';
    return;
  }

  const values = {};
  (data || []).forEach((row) => { values[row.key] = row.value; });
  renderForm(values);
}

main_load();