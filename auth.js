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

// 회원가입: 실제 이메일로 Supabase Auth 계정 생성(확인 메일 발송) + profiles row 생성.
// 서버(/api/check-signup-limit)에 먼저 가입 속도 제한 통과 여부를 확인한다.
async function signUp({ username, email, password, birthdate, bio }) {
  const supabase = await window.getSupabase?.();
  if (!supabase) throw new Error('Supabase가 연결되어 있지 않아요.');
  if (!isValidUsername(username)) {
    throw new Error('아이디는 영문/숫자/밑줄(_)로 3~20자여야 해요.');
  }
  if (!isValidEmail(email)) {
    throw new Error('올바른 이메일 주소를 입력해주세요.');
  }
  if (!birthdate) {
    throw new Error('생년월일을 입력해주세요. (비밀번호 찾기 본인확인용으로 사용돼요)');
  }

  // 가입 속도 제한 체크 (같은 IP에서 짧은 시간 내 반복 가입 방지)
  const limitRes = await fetch('/api/check-signup-limit', { method: 'POST' });
  const limitData = await limitRes.json().catch(() => ({}));
  if (!limitRes.ok) {
    throw new Error(limitData.error || '지금은 가입할 수 없어요. 잠시 후 다시 시도해주세요.');
  }

  const { available } = await checkUsernameAvailable(username);
  if (available === false) {
    throw new Error('이미 사용 중인 아이디예요.');
  }

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: `${window.location.origin}/login.html`,
    },
  });
  if (signUpError) {
    if (/already registered/i.test(signUpError.message)) {
      throw new Error('이미 가입된 이메일이에요.');
    }
    throw signUpError;
  }

  const userId = signUpData.user?.id;
  if (!userId) throw new Error('회원가입에 실패했어요. 다시 시도해주세요.');

  const { error: profileError } = await supabase.from('profiles').insert({
    id: userId,
    username,
    email,
    birthdate,
    bio: bio || null,
  });
  if (profileError) {
    if (/duplicate key/i.test(profileError.message)) {
      throw new Error('이미 사용 중인 아이디예요.');
    }
    throw profileError;
  }

  return signUpData;
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
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  resetPasswordWithBirthdate,
};
