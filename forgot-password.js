const form = document.getElementById('forgot-form');
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
  const birthdate = document.getElementById('birthdate').value;
  const newPassword = document.getElementById('new-password').value;
  const newPassword2 = document.getElementById('new-password2').value;

  if (!username || !birthdate) {
    setMessage('아이디와 생년월일을 입력해주세요.', 'error');
    return;
  }
  if (newPassword.length < 6) {
    setMessage('새 비밀번호는 6자 이상이어야 해요.', 'error');
    return;
  }
  if (newPassword !== newPassword2) {
    setMessage('새 비밀번호가 서로 달라요.', 'error');
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = '확인 중...';

  try {
    await window.RecipeAuth.resetPasswordWithBirthdate({ username, birthdate, newPassword });
    setMessage('비밀번호가 재설정됐어요! 잠시 후 로그인 화면으로 이동합니다.', 'success');
    setTimeout(() => { window.location.href = 'login.html'; }, 1500);
  } catch (err) {
    setMessage(err.message || '비밀번호 재설정 중 문제가 발생했어요.', 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = '비밀번호 재설정 →';
  }
});
