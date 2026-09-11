const form = document.getElementById('signup-form');
const messageBox = document.getElementById('form-message');
const submitButton = document.getElementById('submit-button');
const usernameInput = document.getElementById('username');
const usernameHint = document.getElementById('username-hint');

function setMessage(text, type) {
  messageBox.textContent = text;
  messageBox.className = 'form-message' + (type ? ' ' + type : '');
}

let checkTimer;
usernameInput.addEventListener('input', () => {
  clearTimeout(checkTimer);
  const value = usernameInput.value.trim();
  usernameHint.textContent = '';
  usernameHint.className = 'field-hint';
  if (!value) return;
  if (!window.RecipeAuth.isValidUsername(value)) {
    usernameHint.textContent = '영문/숫자/밑줄(_)로 3~20자로 입력해주세요.';
    usernameHint.classList.add('error');
    return;
  }
  checkTimer = setTimeout(async () => {
    const { available, reason } = await window.RecipeAuth.checkUsernameAvailable(value);
    if (reason === 'no-backend') return;
    if (available === true) {
      usernameHint.textContent = '사용할 수 있는 아이디예요.';
      usernameHint.classList.add('success');
    } else if (available === false) {
      usernameHint.textContent = '이미 사용 중인 아이디예요.';
      usernameHint.classList.add('error');
    }
  }, 400);
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  setMessage('', '');

  const username = usernameInput.value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const password2 = document.getElementById('password2').value;
  const birthdate = document.getElementById('birthdate').value;
  const bio = document.getElementById('bio').value.trim();

  if (!window.RecipeAuth.isValidUsername(username)) {
    setMessage('아이디 형식을 확인해주세요.', 'error');
    return;
  }
  if (!window.RecipeAuth.isValidEmail(email)) {
    setMessage('올바른 이메일 주소를 입력해주세요.', 'error');
    return;
  }
  if (password.length < 6) {
    setMessage('비밀번호는 6자 이상이어야 해요.', 'error');
    return;
  }
  if (password !== password2) {
    setMessage('비밀번호가 서로 달라요.', 'error');
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = '가입 처리 중...';

  try {
    await window.RecipeAuth.signUp({ username, email, password, birthdate, bio });
    setMessage('확인 메일을 보냈어요! 메일의 링크를 누르면 가입이 완료돼요.', 'success');
  } catch (err) {
    setMessage(err.message || '회원가입 중 문제가 발생했어요.', 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = '회원가입 →';
  }
});
