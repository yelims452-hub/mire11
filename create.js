const ingredientList = document.getElementById('ingredient-list');
const stepList = document.getElementById('step-list');
const mediaInput = document.getElementById('media-input');
const mediaPreview = document.getElementById('media-preview');
const form = document.getElementById('recipe-form');
const messageBox = document.getElementById('form-message');
const submitButton = document.getElementById('submit-button');

let mediaFiles = [];

function addIngredientRow(name = '', amount = '') {
  const row = document.createElement('div');
  row.className = 'ingredient-row';
  row.innerHTML = `
    <input type="text" class="ing-name" placeholder="재료명 (예: 아보카도)" value="${name}" />
    <input type="text" class="ing-amount" placeholder="계량 (예: 1개, 선택)" value="${amount}" />
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

// 기본 재료 2줄, 단계 2줄로 시작
addIngredientRow();
addIngredientRow();
addStepRow();
addStepRow();

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
    thumb.innerHTML = isVideo
      ? `<video src="${url}" muted></video>`
      : `<img src="${url}" alt="업로드 미리보기" />`;
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '✕';
    removeBtn.setAttribute('aria-label', '미디어 삭제');
    removeBtn.addEventListener('click', () => {
      mediaFiles.splice(idx, 1);
      renderMediaPreview();
    });
    thumb.appendChild(removeBtn);
    mediaPreview.appendChild(thumb);
  });
}

function setMessage(text, type) {
  messageBox.textContent = text;
  messageBox.className = 'form-message' + (type ? ' ' + type : '');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  setMessage('', '');

  const title = document.getElementById('title').value.trim();
  const author = document.getElementById('author').value.trim();
  const category = document.getElementById('category').value;
  const duration = document.getElementById('duration').value.trim();
  const tagsRaw = document.getElementById('tags').value.trim();
  const tips = document.getElementById('tips').value.trim();

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
  submitButton.textContent = '업로드 중...';

  try {
    const supabase = await window.getSupabase?.();

    let mediaUrls = [];
    if (supabase && mediaFiles.length) {
      for (const file of mediaFiles) {
        const path = `${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('recipe-media')
          .upload(path, file);
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
      source_url: null,
    };

    if (supabase) {
      const { error } = await supabase.from('recipes').insert(payload);
      if (error) throw error;
      setMessage('레시피가 성공적으로 등록됐어요! 잠시 후 피드로 이동합니다.', 'success');
      setTimeout(() => { window.location.href = 'feed.html'; }, 1500);
    } else {
      // Supabase 미연결 시: 브라우저 로컬에 임시 저장 (내 화면에서만 확인 가능)
      const local = JSON.parse(localStorage.getItem('local_recipes') || '[]');
      local.unshift({ ...payload, id: 'local-' + Date.now(), likes: 0, created_at: new Date().toISOString() });
      localStorage.setItem('local_recipes', JSON.stringify(local));
      setMessage('Supabase 연동 전이라 이 브라우저에만 임시 저장했어요. (다른 사람에게는 아직 보이지 않아요)', 'success');
      setTimeout(() => { window.location.href = 'feed.html'; }, 1800);
    }
  } catch (err) {
    console.error(err);
    setMessage('업로드 중 문제가 발생했어요: ' + (err.message || err), 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = '레시피 올리기 →';
  }
});
