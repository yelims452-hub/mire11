// 아이디(username) 기반 로그인을 Supabase Auth 위에 구현한다.
// Supabase Auth는 이메일 기반이라, username을 내부 도메인의 가짜 이메일로 변환해서 사용한다.
// 예: "yuri" -> "yuri@users.recipe-to-world.local"
const FAKE_EMAIL_DOMAIN = 'users.recipe-to-world.local';
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

function usernameToEmail(username) {
  return `${username.toLowerCase()}@${FAKE_EMAIL_DOMAIN}`;
}

function isValidUsername(username) {
  return USERNAME_PATTERN.test(username);
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

// 회원가입: Supabase Auth 계정 생성 + profiles row 생성
async function signUp({ username, password, birthdate, bio }) {
  const supabase = await window.getSupabase?.();
  if (!supabase) throw new Error('Supabase가 연결되어 있지 않아요.');
  if (!isValidUsername(username)) {
    throw new Error('아이디는 영문/숫자/밑줄(_)로 3~20자여야 해요.');
  }

  const { available } = await checkUsernameAvailable(username);
  if (available === false) {
    throw new Error('이미 사용 중인 아이디예요.');
  }

  const email = usernameToEmail(username);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });
  if (signUpError) {
    if (/already registered/i.test(signUpError.message)) {
      throw new Error('이미 사용 중인 아이디예요.');
    }
    throw signUpError;
  }

  const userId = signUpData.user?.id;
  if (!userId) throw new Error('회원가입에 실패했어요. 다시 시도해주세요.');

  const { error: profileError } = await supabase.from('profiles').insert({
    id: userId,
    username,
    birthdate: birthdate || null,
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

// 로그인: username -> 내부 이메일 변환 후 Supabase Auth 로그인
async function signIn({ username, password }) {
  const supabase = await window.getSupabase?.();
  if (!supabase) throw new Error('Supabase가 연결되어 있지 않아요.');
  const email = usernameToEmail(username);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
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
  checkUsernameAvailable,
  signUp,
  signIn,
  signOut,
  getCurrentUser,
};
