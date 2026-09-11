// Vercel Serverless Function
// POST { username, birthdate, newPassword } -> 아이디+생년월일이 일치하면 비밀번호를 재설정한다.
// service_role 키로만 가능한 관리자 권한 작업(다른 사용자 비밀번호 변경)이라 서버에서 처리한다.

const FAKE_EMAIL_DOMAIN = 'recipe-to-world-users.com';

function usernameToEmail(username) {
  return `${username.toLowerCase()}@${FAKE_EMAIL_DOMAIN}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 지원해요.' });

  const { username, birthdate, newPassword } = req.body || {};
  if (!username || !birthdate || !newPassword) {
    return res.status(400).json({ error: '아이디, 생년월일, 새 비밀번호를 모두 입력해주세요.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: '비밀번호는 6자 이상이어야 해요.' });
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
    // 1) profiles에서 아이디로 사용자 찾고 생년월일 대조
    const profileRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?username=ilike.${encodeURIComponent(username)}&select=id,birthdate`,
      { headers: authHeaders }
    );
    if (!profileRes.ok) throw new Error('사용자 조회에 실패했어요.');
    const profiles = await profileRes.json();
    const profile = profiles[0];

    if (!profile) {
      return res.status(404).json({ error: '해당 아이디를 찾을 수 없어요.' });
    }
    if (profile.birthdate !== birthdate) {
      return res.status(403).json({ error: '생년월일이 일치하지 않아요.' });
    }

    // 2) Supabase Admin API로 해당 유저의 비밀번호를 직접 재설정
    const updateRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${profile.id}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ password: newPassword }),
    });
    if (!updateRes.ok) {
      const errText = await updateRes.text();
      throw new Error(`비밀번호 재설정 실패: ${errText.slice(0, 300)}`);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || '비밀번호 재설정 중 문제가 발생했어요.' });
  }
}
