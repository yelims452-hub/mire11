const form = document.getElementById('login-form');
const messageBox = document.getElementById('form-message');
const submitButton = document.getElementById('submit-button');

function setMessage(text, type) {
  messageBox.textContent = text;
  messageBox.className = 'form-message' + (type ? ' ' + type : '');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  setMessage('', '');

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  submitButton.disabled = true;
  submitButton.textContent = '로그인 중...';

  try {
    await window.RecipeAuth.signIn({ username, password });
    setMessage('로그인 성공! 잠시 후 이동합니다.', 'success');
    setTimeout(() => { window.location.href = 'profile.html'; }, 900);
  } catch (err) {
    setMessage(err.message || '로그인 중 문제가 발생했어요.', 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = '로그인 →';
  }
});
