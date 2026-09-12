// 회원가입 3단계 흐름 컨트롤러
// 1단계: 이름 + 생년월일 (프론트 상태로만 보관, 아직 DB에 쓰지 않음)
// 2단계: 이메일 입력 → OTP(6자리) 발송 → 인증번호 확인 (성공 시 Supabase 로그인 세션 생성됨)
// 3단계: 아이디 + 비밀번호 설정 → 계정 완성 (profiles row 생성)

const steps = {
  1: document.getElementById('step1-form'),
  2: document.getElementById('step2-form'),
  3: document.getElementById('step3-form'),
};
const stepIndicators = [...document.querySelectorAll('.signup-step')];

// 단계 사이에 들고 다닐 값들
const state = {
  name: '',
  birthdate: '',
  email: '',
};

function setMessage(el, text, type) {
  el.textContent = text;
  el.className = 'form-message' + (type ? ' ' + type : '');
}

function goToStep(stepNumber) {
  Object.entries(steps).forEach(([num, form]) => {
    form.hidden = Number(num) !== stepNumber;
  });
  stepIndicators.forEach((el) => {
    const n = Number(el.dataset.step);
    el.classList.toggle('is-active', n === stepNumber);
    el.classList.toggle('is-done', n < stepNumber);
  });
}

// ── 1단계: 이름 + 생년월일 ──────────────────────────────
const step1Form = steps[1];
const step1Message = document.getElementById('step1-message');

step1Form.addEventListener('submit', (e) => {
  e.preventDefault();
  setMessage(step1Message, '', '');

  const name = document.getElementById('name').value.trim();
  const birthdate = document.getElementById('birthdate').value;

  if (!name) {
    setMessage(step1Message, '이름을 입력해주세요.', 'error');
    return;
  }
  if (!birthdate) {
    setMessage(step1Message, '생년월일을 입력해주세요.', 'error');
    return;
  }

  state.name = name;
  state.birthdate = birthdate;
  goToStep(2);
});

// ── 2단계: 이메일 + OTP 인증 ──────────────────────────────
const step2Form = steps[2];
const step2Message = document.getElementById('step2-message');
const emailInput = document.getElementById('email');
const emailHint = document.getElementById('email-hint');
const sendCodeButton = document.getElementById('send-code-button');
const resendCodeButton = document.getElementById('resend-code-button');
const otpBlock = document.getElementById('otp-block');
const otpCodeInput = document.getElementById('otp-code');
const step2Back = document.getElementById('step2-back');
const step2Submit = document.getElementById('step2-submit');

let otpSent = false;

async function requestOtp() {
  const email = emailInput.value.trim();
  if (!window.RecipeAuth.isValidEmail(email)) {
    emailHint.textContent = '올바른 이메일 주소를 입력해주세요.';
    emailHint.className = 'field-hint error';
    return;
  }

  sendCodeButton.disabled = true;
  resendCodeButton.disabled = true;
  const originalLabel = sendCodeButton.textContent;
  sendCodeButton.textContent = '전송 중...';
  emailHint.textContent = '';
  emailHint.className = 'field-hint';

  try {
    await window.RecipeAuth.sendSignupOtp({ email });
    state.email = email;
    otpSent = true;
    otpBlock.hidden = false;
    step2Submit.disabled = false;
    emailHint.textContent = '인증번호를 보냈어요! 이메일을 확인해주세요. (스팸함도 확인해보세요)';
    emailHint.className = 'field-hint success';
    otpCodeInput.focus();
  } catch (err) {
    emailHint.textContent = err.message || '인증번호 발송에 실패했어요.';
    emailHint.className = 'field-hint error';
  } finally {
    sendCodeButton.disabled = false;
    resendCodeButton.disabled = false;
    sendCodeButton.textContent = originalLabel;
  }
}

sendCodeButton.addEventListener('click', requestOtp);
resendCodeButton.addEventListener('click', requestOtp);

// 이메일을 바꾸면 기존에 받은 인증번호는 무효화(다시 받아야 함)
emailInput.addEventListener('input', () => {
  if (otpSent) {
    otpSent = false;
    otpBlock.hidden = true;
    step2Submit.disabled = true;
    otpCodeInput.value = '';
  }
});

step2Back.addEventListener('click', () => goToStep(1));

step2Submit.addEventListener('click', async () => {
  setMessage(step2Message, '', '');
  const code = otpCodeInput.value.trim();
  if (!code) {
    setMessage(step2Message, '인증번호를 입력해주세요.', 'error');
    return;
  }

  step2Submit.disabled = true;
  const originalLabel = step2Submit.innerHTML;
  step2Submit.innerHTML = '확인 중...';

  try {
    await window.RecipeAuth.verifySignupOtp({ email: state.email, token: code });
    setMessage(step2Message, '이메일 인증이 완료됐어요!', 'success');
    document.getElementById('username-hint').textContent = '';
    setTimeout(() => goToStep(3), 500);
  } catch (err) {
    setMessage(step2Message, err.message || '인증번호 확인에 실패했어요.', 'error');
    step2Submit.disabled = false;
  } finally {
    step2Submit.innerHTML = originalLabel;
  }
});

// ── 3단계: 아이디 + 비밀번호 ──────────────────────────────
const step3Form = steps[3];
const step3Message = document.getElementById('step3-message');
const usernameInput = document.getElementById('username');
const usernameHint = document.getElementById('username-hint');

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

step3Form.addEventListener('submit', async (e) => {
  e.preventDefault();
  setMessage(step3Message, '', '');

  const username = usernameInput.value.trim();
  const password = document.getElementById('password').value;
  const password2 = document.getElementById('password2').value;
  const bio = document.getElementById('bio').value.trim();

  if (!window.RecipeAuth.isValidUsername(username)) {
    setMessage(step3Message, '아이디 형식을 확인해주세요.', 'error');
    return;
  }
  if (password.length < 6) {
    setMessage(step3Message, '비밀번호는 6자 이상이어야 해요.', 'error');
    return;
  }
  if (password !== password2) {
    setMessage(step3Message, '비밀번호가 서로 달라요.', 'error');
    return;
  }

  const submitButton = document.getElementById('step3-submit');
  submitButton.disabled = true;
  submitButton.textContent = '가입 처리 중...';

  try {
    await window.RecipeAuth.completeSignup({
      username,
      password,
      name: state.name,
      birthdate: state.birthdate,
      bio,
    });
    setMessage(step3Message, '회원가입이 완료됐어요! 잠시 후 이동합니다.', 'success');
    setTimeout(() => { window.location.href = 'profile.html'; }, 1200);
  } catch (err) {
    setMessage(step3Message, err.message || '회원가입 중 문제가 발생했어요.', 'error');
    submitButton.disabled = false;
    submitButton.textContent = '회원가입 완료 →';
  }
});

goToStep(1);
