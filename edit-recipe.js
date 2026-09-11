const params = new URLSearchParams(window.location.search);
const recipeId = params.get('id');

const statusMessage = document.getElementById('status-message');
const form = document.getElementById('recipe-form');
const ingredientList = document.getElementById('ingredient-list');
const stepList = document.getElementById('step-list');
const mediaInput = document.getElementById('media-input');
const mediaPreview = document.getElementById('media-preview');
const existingMedia = document.getElementById('existing-media');
const messageBox = document.getElementById('form-message');
const submitButton = document.getElementById('submit-button');

let mediaFiles = [];
let existingMediaUrls = [];
let currentRecipe = null;
let currentUser = null;

function setMessage(text, type) {
  messageBox.textContent = text;
  messageBox.className = 'form-message' + (type ? ' ' + type : '');
}

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
    <textarea class="step-text" rows="2">${text}</textarea>
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

function renderExistingMedia() {
  existingMedia.innerHTML = existingMediaUrls.map((url, idx) => `
    <div class="thumb">
      ${/\.(mp4|webm|mov)(\?|$)/i.test(url) ? `<video src="${url}" muted></video>` : `<img src="${url}" alt="기존 이미지" />`}
      <button type="button" data-idx="${idx}" aria-label="삭제">✕</button>
    </div>
  `).join('');
  existingMedia.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      existingMediaUrls.splice(Number(btn.dataset.idx), 1);
      renderExistingMedia();
    });
  });
}

mediaInput.addEventListener('change', () => {
  const files = Array.from(mediaInput.files || []);
  mediaFiles = mediaFiles.concat(files);
  renderNewMediaPreview();
  mediaInput.value = '';
});

function renderNewMediaPreview() {
  mediaPreview.innerHTML = '';
  mediaFiles.forEach((file, idx) => {
    const url = URL.createObjectURL(file);
    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    const isVideo = file.type.startsWith('video');
    thumb.innerHTML = isVideo ? `<video src="${url}" muted></video>` : `<img src="${url}" alt="새 미디어" />`;
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', () => {
      mediaFiles.splice(idx, 1);
      renderNewMediaPreview();
    });
    thumb.appendChild(removeBtn);
    mediaPreview.appendChild(thumb);
  });
}

async function load() {
  if (!recipeId) {
    statusMessage.textContent = '레시피를 찾을 수 없어요.';
    return;
  }
  currentUser = await window.RecipeAuth?.getCurrentUser?.();
  if (!currentUser?.profile) {
    statusMessage.innerHTML = '로그인이 필요해요. <a href="login.html">로그인하기</a>';
    return;
  }

  const supabase = await window.getSupabase?.();
  if (!supabase) {
    statusMessage.textContent = 'Supabase 연결이 필요해요.';
    return;
  }

  const { data: recipe, error } = await supabase.from('recipes').select('*').eq('id', recipeId).single();
  if (error || !recipe) {
    statusMessage.textContent = '레시피를 불러오지 못했어요.';
    return;
  }

  if (recipe.user_id !== currentUser.user.id) {
    statusMessage.textContent = '본인이 작성한 레시피만 수정할 수 있어요.';
    return;
  }

  currentRecipe = recipe;
  document.getElementById('title').value = recipe.recipe_name || '';
  document.getElementById('category').value = recipe.category || '기타';
  document.getElementById('duration').value = recipe.duration || '';
  document.getElementById('tags').value = (recipe.tags || []).join(', ');
  document.getElementById('tips').value = recipe.tips || '';
  document.getElementById('author-display').textContent = '@' + currentUser.profile.username;

  existingMediaUrls = [...(recipe.media || [])];
  renderExistingMedia();

  ingredientList.innerHTML = '';
  (recipe.ingredients?.length ? recipe.ingredients : [{ name: '', amount: '' }]).forEach((i) => addIngredientRow(i.name, i.amount));

  stepList.innerHTML = '';
  (recipe.instructions?.length ? recipe.instructions : ['']).forEach((s) => addStepRow(s));

  statusMessage.hidden = true;
  form.hidden = false;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  setMessage('', '');

  const title = document.getElementById('title').value.trim();
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

  if (!title) {
    setMessage('레시피 이름을 입력해주세요.', 'error');
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
  submitButton.textContent = '저장 중...';

  try {
    const supabase = await window.getSupabase?.();
    let newMediaUrls = [];
    if (mediaFiles.length) {
      for (const file of mediaFiles) {
        const path = `${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from('recipe-media').upload(path, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('recipe-media').getPublicUrl(path);
        newMediaUrls.push(data.publicUrl);
      }
    }
    const finalMedia = [...existingMediaUrls, ...newMediaUrls];

    const { error } = await supabase.from('recipes').update({
      recipe_name: title,
      category,
      duration: duration || null,
      tags: tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : [],
      ingredients,
      instructions,
      tips: tips || null,
      image: finalMedia[0] || null,
      media: finalMedia,
    }).eq('id', recipeId);

    if (error) throw error;
    setMessage('수정 완료! 잠시 후 레시피 페이지로 이동합니다.', 'success');
    setTimeout(() => { window.location.href = `recipe.html?id=${recipeId}`; }, 1200);
  } catch (err) {
    console.error(err);
    setMessage('저장 중 문제가 발생했어요: ' + (err.message || err), 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = '수정 완료 →';
  }
});

load();
