// 아이디(username) 기반 로그인. 로그인 자체는 Supabase Auth 위에서 동작하되,
// 계정은 반드시 "실제 이메일"로 생성해 Supabase가 진짜 확인 메일을 보내도록 한다.
// (한 사람이 무한 계정을 만드는 것을 억제하기 위한 최소한의 검증 장치)
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidUsername(username) {
  return USERNAME_PATTERN.test(username);
}

function isValidEmail(email) {
  return EMAIL_PATTERN.test(email);
}

// 아이디 중복 여부 확인 (profiles 테이블 조회)
async function checkUsernameAvailable(username) {
  const supabase = await window.getSupabase?.();
  if (!supabase) return { available: null, reason: 'no-backend' };
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .ilike('username', username)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') {
    console.error(error);
    return { available: null, reason: error.message };
  }
  return { available: !data, reason: null };
}

// ─────────────────────────────────────────────────────────
// 회원가입 플로우 (3단계, 이메일 OTP 인증 방식)
// 1) 이름 + 생년월일 입력 (프론트 상태로만 보관)
// 2) 이메일 입력 → Supabase Auth OTP(6자리 코드) 발송 → 코드 검증
//    - signInWithOtp({ email })는 계정이 없으면 새로 만들고(shouldCreateUser 기본 true),
//      있으면 기존 계정에 로그인 코드를 보낸다. verifyOtp가 성공하면 그 즉시
//      로그인 세션이 생겨 auth.uid()가 채워진다(비밀번호는 아직 없는 상태).
// 3) 아이디 + 비밀번호 설정 → updateUser({ password })로 비밀번호 부여 +
//    서버 API(/api/create-profile)로 profiles row 생성
// ─────────────────────────────────────────────────────────

// 2단계: 이메일로 OTP(6자리) 발송
async function sendSignupOtp({ email }) {
  const supabase = await window.getSupabase?.();
  if (!supabase) throw new Error('Supabase가 연결되어 있지 않아요.');
  if (!isValidEmail(email)) {
    throw new Error('올바른 이메일 주소를 입력해주세요.');
  }

  // 가입 속도 제한 체크 (같은 IP에서 짧은 시간 내 반복 가입 방지)
  const limitRes = await fetch('/api/check-signup-limit', { method: 'POST' });
  const limitData = await limitRes.json().catch(() => ({}));
  if (!limitRes.ok) {
    throw new Error(limitData.error || '지금은 가입할 수 없어요. 잠시 후 다시 시도해주세요.');
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) {
    throw new Error(error.message || '인증번호 발송에 실패했어요.');
  }
}

// 2단계: 이메일로 받은 6자리 코드 검증. 성공하면 로그인 세션이 생긴다.
async function verifySignupOtp({ email, token }) {
  const supabase = await window.getSupabase?.();
  if (!supabase) throw new Error('Supabase가 연결되어 있지 않아요.');
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) {
    throw new Error('인증번호가 올바르지 않거나 만료됐어요. 다시 확인해주세요.');
  }
  return data;
}

// 3단계: OTP 인증까지 끝난 로그인 세션 위에서 비밀번호를 설정하고 profiles row를 생성한다.
async function completeSignup({ username, password, name, birthdate, bio }) {
  const supabase = await window.getSupabase?.();
  if (!supabase) throw new Error('Supabase가 연결되어 있지 않아요.');
  if (!isValidUsername(username)) {
    throw new Error('아이디는 영문/숫자/밑줄(_)로 3~20자여야 해요.');
  }
  if (!birthdate) {
    throw new Error('생년월일 정보가 없어요. 처음부터 다시 시도해주세요.');
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    throw new Error('이메일 인증 세션이 만료됐어요. 처음부터 다시 시도해주세요.');
  }
  const userId = userData.user.id;
  const email = userData.user.email;

  const { available } = await checkUsernameAvailable(username);
  if (available === false) {
    throw new Error('이미 사용 중인 아이디예요.');
  }

  const { error: pwError } = await supabase.auth.updateUser({ password });
  if (pwError) {
    throw new Error(pwError.message || '비밀번호 설정에 실패했어요.');
  }

  // profiles row 생성은 서버 API(/api/create-profile)가 담당한다.
  // (service_role로 신원 확인 후 생성 — 클라이언트 RLS 이슈를 피하고 기존 패턴과 일관성 유지)
  const profileRes = await fetch('/api/create-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, username, email, birthdate, bio, name }),
  });
  const profileData = await profileRes.json().catch(() => ({}));
  if (!profileRes.ok) {
    throw new Error(profileData.error || '프로필 생성 중 문제가 발생했어요.');
  }

  return profileData;
}

// 비밀번호 찾기: 아이디 + 생년월일(본인확인) + 새 비밀번호를 서버 API(/api/reset-password)로 보낸다.
// 서버가 service_role 키로 생년월일이 일치하는지 확인 후 비밀번호를 직접 재설정한다.
async function resetPasswordWithBirthdate({ username, birthdate, newPassword }) {
  const res = await fetch('/api/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, birthdate, newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '비밀번호 재설정에 실패했어요.');
  return data;
}

// 로그인: username -> profiles에서 실제 이메일 조회 후 Supabase Auth 로그인
async function signIn({ username, password }) {
  const supabase = await window.getSupabase?.();
  if (!supabase) throw new Error('Supabase가 연결되어 있지 않아요.');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email')
    .ilike('username', username)
    .maybeSingle();
  if (profileError || !profile) {
    throw new Error('아이디 또는 비밀번호가 올바르지 않아요.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email: profile.email, password });
  if (error) {
    if (/email not confirmed/i.test(error.message)) {
      throw new Error('이메일 인증이 아직 완료되지 않았어요. 받은 메일함을 확인해주세요.');
    }
    throw new Error('아이디 또는 비밀번호가 올바르지 않아요.');
  }
  return data;
}

async function signOut() {
  const supabase = await window.getSupabase?.();
  if (!supabase) return;
  await supabase.auth.signOut();
}

// 현재 로그인한 사용자 + 프로필 정보를 함께 반환
async function getCurrentUser() {
  const supabase = await window.getSupabase?.();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  return { user, profile };
}

window.RecipeAuth = {
  isValidUsername,
  isValidEmail,
  checkUsernameAvailable,
  sendSignupOtp,
  verifySignupOtp,
  completeSignup,
  signIn,
  signOut,
  getCurrentUser,
  resetPasswordWithBirthdate,
};
