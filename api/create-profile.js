// Vercel Serverless Function
// POST { userId, username, email, birthdate, bio } -> profiles row를 service_role 권한으로 생성한다.
//
// 배경: 이 프로젝트는 Supabase Auth의 "Confirm email" 옵션이 켜져 있어,
// supabase.auth.signUp() 직후에는 로그인 세션이 없다(이메일 인증 전까지 auth.uid()가 없음).
// 그런데 profiles 테이블의 insert 정책은 `auth.uid() = id` 조건이라, 세션이 없는 상태에서
// 클라이언트가 직접 profiles.insert()를 호출하면 RLS 위반으로 항상 실패한다.
// 그래서 회원가입 계정 생성(Auth) 자체는 클라이언트에서 그대로 하되(확인 메일 발송을 위해),
// profiles row 생성만 이 서버 API가 service_role 키로 대신 처리한다.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 지원해요.' });

  const { userId, username, email, birthdate, bio } = req.body || {};
  if (!userId || !username || !email || !birthdate) {
    return res.status(400).json({ error: 'userId, username, email, birthdate가 모두 필요해요.' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'https://awlcdgbcwxthwryzkhia.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return res.status(500).json({ error: '서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않아요.' });
  }

  const authHeaders = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  };

  try {
    // 1) userId가 실제로 Supabase Auth에 존재하는 사용자인지 확인 (임의 id로 profile을 만들지 못하게 방지)
    const userCheckRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      headers: authHeaders,
    });
    if (!userCheckRes.ok) {
      return res.status(400).json({ error: '유효하지 않은 사용자예요.' });
    }
    const userRecord = await userCheckRes.json();
    if (!userRecord?.email || userRecord.email.toLowerCase() !== String(email).toLowerCase()) {
      return res.status(400).json({ error: '사용자 정보가 일치하지 않아요.' });
    }

    // 2) 아이디 중복 재확인 (동시 가입 경합 대비, 최종 방어선은 DB의 unique 제약)
    const dupRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?username=ilike.${encodeURIComponent(username)}&select=id`,
      { headers: authHeaders }
    );
    const dupRows = await dupRes.json().catch(() => []);
    if (Array.isArray(dupRows) && dupRows.length > 0) {
      return res.status(409).json({ error: '이미 사용 중인 아이디예요.' });
    }

    // 3) profiles row 생성 (service_role -> RLS 우회)
    const insertRes = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
      method: 'POST',
      headers: { ...authHeaders, Prefer: 'return=representation' },
      body: JSON.stringify({
        id: userId,
        username,
        email,
        birthdate,
        bio: bio || null,
      }),
    });

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      if (/duplicate key/i.test(errText)) {
        return res.status(409).json({ error: '이미 사용 중인 아이디예요.' });
      }
      throw new Error(`프로필 생성 실패: ${errText.slice(0, 300)}`);
    }

    const [profile] = await insertRes.json();
    return res.status(200).json({ success: true, profile });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || '프로필 생성 중 문제가 발생했어요.' });
  }
}
