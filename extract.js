const ingredientList = document.getElementById('ingredient-list');
const stepList = document.getElementById('step-list');
const mediaInput = document.getElementById('media-input');
const mediaPreview = document.getElementById('media-preview');
const form = document.getElementById('recipe-form');
const messageBox = document.getElementById('form-message');
const submitButton = document.getElementById('submit-button');
const sourceUrlInput = document.getElementById('source-url');
const analyzeBtn = document.getElementById('analyze-btn');
const extractStatus = document.getElementById('extract-status');
const manualJson = document.getElementById('manual-json');
const applyJsonBtn = document.getElementById('apply-json-btn');

let mediaFiles = [];

function addIngredientRow(name = '', amount = '') {
  const row = document.createElement('div');
  row.className = 'ingredient-row';
  row.innerHTML = `
    <input type="text" class="ing-name" placeholder="재료명" value="${name}" />
    <input type="text" class="ing-amount" placeholder="계량 (선택)" value="${amount || ''}" />
    <button type="button" class="remove-row" aria-label="재료 삭제">✕</button>
  `;
  row.querySelector('.remove-row').addEventListener('click', () => row.remove());
  ingredientList.appendChild(row);
}

function addStepRow(text = '') {
  const row = document.createElement('div');
  row.className = 'step-row';
  const num = stepList.children.length + 1;
  row.innerHTML = `
    <span class="step-num">${num}</span>
    <textarea class="step-text" rows="2" placeholder="조리 과정을 설명해주세요.">${text}</textarea>
    <button type="button" class="remove-row" aria-label="단계 삭제">✕</button>
  `;
  row.querySelector('.remove-row').addEventListener('click', () => {
    row.remove();
    renumberSteps();
  });
  stepList.appendChild(row);
}

function renumberSteps() {
  [...stepList.querySelectorAll('.step-row')].forEach((row, i) => {
    row.querySelector('.step-num').textContent = i + 1;
  });
}

document.getElementById('add-ingredient').addEventListener('click', () => addIngredientRow());
document.getElementById('add-step').addEventListener('click', () => addStepRow());

mediaInput.addEventListener('change', () => {
  const files = Array.from(mediaInput.files || []);
  mediaFiles = mediaFiles.concat(files);
  renderMediaPreview();
  mediaInput.value = '';
});

function renderMediaPreview() {
  mediaPreview.innerHTML = '';
  mediaFiles.forEach((file, idx) => {
    const url = URL.createObjectURL(file);
    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    const isVideo = file.type.startsWith('video');
    thumb.innerHTML = isVideo ? `<video src="${url}" muted></video>` : `<img src="${url}" alt="업로드 미리보기" />`;
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', () => {
      mediaFiles.splice(idx, 1);
      renderMediaPreview();
    });
    thumb.appendChild(removeBtn);
    mediaPreview.appendChild(thumb);
  });
}

function setStatus(text, type) {
  extractStatus.textContent = text;
  extractStatus.className = 'field-hint' + (type ? ' ' + type : '');
}

function setMessage(text, type) {
  messageBox.textContent = text;
  messageBox.className = 'form-message' + (type ? ' ' + type : '');
}

// 분석 결과(JSON)를 받아 폼을 채운다.
function fillFormFromRecipeData(data) {
  document.getElementById('title').value = data.recipe_name || '';
  document.getElementById('category').value = data.category || '기타';
  document.getElementById('duration').value = data.duration || '';
  document.getElementById('tags').value = (data.tags || []).join(', ');
  document.getElementById('tips').value = data.tips || '';
  document.getElementById('source-url-final').value = data.source_url || sourceUrlInput.value || '';

  ingredientList.innerHTML = '';
  (data.ingredients && data.ingredients.length ? data.ingredients : [{ name: '', amount: '' }])
    .forEach((i) => addIngredientRow(i.name || '', i.amount || ''));

  stepList.innerHTML = '';
  (data.instructions && data.instructions.length ? data.instructions : [''])
    .forEach((s) => addStepRow(s || ''));

  form.hidden = false;
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// "분석하기" 버튼: 실제 자동 분석 API가 아직 없으므로, 채팅에서 분석한 결과를
// 아래 "분석 결과 붙여넣기" 칸에 넣어 반영하도록 안내한다.
analyzeBtn.addEventListener('click', () => {
  const url = sourceUrlInput.value.trim();
  if (!url) {
    setStatus('먼저 유튜브 또는 블로그 URL을 입력해주세요.', 'error');
    return;
  }
  try {
    new URL(url);
  } catch {
    setStatus('올바른 URL 형식이 아니에요.', 'error');
    return;
  }
  setStatus('이 링크를 Timely 채팅창에 붙여넣고 "이 레시피 추출해줘"라고 요청해주세요. 분석 결과(JSON)를 아래 칸에 붙여넣으면 자동으로 폼이 채워져요.', 'success');
  document.getElementById('manual-paste-block').scrollIntoView({ behavior: 'smooth', block: 'center' });
  manualJson.focus();
});

applyJsonBtn.addEventListener('click', () => {
  const raw = manualJson.value.trim();
  if (!raw) {
    setStatus('붙여넣은 분석 결과가 없어요.', 'error');
    return;
  }
  try {
    const data = JSON.parse(raw);
    fillFormFromRecipeData(data);
    setStatus('분석 결과를 불러왔어요. 아래에서 확인하고 수정한 뒤 등록해주세요.', 'success');
  } catch (err) {
    setStatus('JSON 형식을 확인해주세요: ' + err.message, 'error');
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  setMessage('', '');

  const title = document.getElementById('title').value.trim();
  const author = document.getElementById('author').value.trim();
  const category = document.getElementById('category').value;
  const duration = document.getElementById('duration').value.trim();
  const tagsRaw = document.getElementById('tags').value.trim();
  const tips = document.getElementById('tips').value.trim();
  const sourceUrl = document.getElementById('source-url-final').value.trim() || null;

  const ingredients = [...ingredientList.querySelectorAll('.ingredient-row')]
    .map((row) => ({
      name: row.querySelector('.ing-name').value.trim(),
      amount: row.querySelector('.ing-amount').value.trim() || null,
    }))
    .filter((i) => i.name);

  const instructions = [...stepList.querySelectorAll('.step-text')]
    .map((t) => t.value.trim())
    .filter(Boolean);

  if (!title || !author) {
    setMessage('레시피 이름과 작성자 닉네임을 입력해주세요.', 'error');
    return;
  }
  if (ingredients.length === 0) {
    setMessage('재료를 최소 1개 이상 입력해주세요.', 'error');
    return;
  }
  if (instructions.length === 0) {
    setMessage('조리 순서를 최소 1단계 이상 입력해주세요.', 'error');
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = '등록 중...';

  try {
    const supabase = await window.getSupabase?.();

    let mediaUrls = [];
    if (supabase && mediaFiles.length) {
      for (const file of mediaFiles) {
        const path = `${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from('recipe-media').upload(path, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('recipe-media').getPublicUrl(path);
        mediaUrls.push(data.publicUrl);
      }
    }

    const payload = {
      recipe_name: title,
      category,
      duration: duration || null,
      author,
      tags: tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : [],
      ingredients,
      instructions,
      tips: tips || null,
      image: mediaUrls[0] || null,
      media: mediaUrls,
      source_url: sourceUrl,
    };

    if (supabase) {
      const { error } = await supabase.from('recipes').insert(payload);
      if (error) throw error;
      setMessage('레시피가 성공적으로 등록됐어요! 잠시 후 피드로 이동합니다.', 'success');
      setTimeout(() => { window.location.href = 'feed.html'; }, 1500);
    } else {
      const local = JSON.parse(localStorage.getItem('local_recipes') || '[]');
      local.unshift({ ...payload, id: 'local-' + Date.now(), likes: 0, created_at: new Date().toISOString() });
      localStorage.setItem('local_recipes', JSON.stringify(local));
      setMessage('Supabase 연동 전이라 이 브라우저에만 임시 저장했어요.', 'success');
      setTimeout(() => { window.location.href = 'feed.html'; }, 1800);
    }
  } catch (err) {
    console.error(err);
    setMessage('등록 중 문제가 발생했어요: ' + (err.message || err), 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = '이 레시피 등록하기 →';
  }
});
