// Vercel Serverless Function
// POST -> 요청자의 IP를 기준으로 최근 가입 시도 횟수를 확인하고, 제한을 초과하면 차단한다.
// 실제 계정 생성 여부와 무관하게 "가입 시도"를 기록한다(같은 IP에서 반복 시도 자체를 억제).

const WINDOW_MINUTES = 60; // 이 시간(분) 내
const MAX_ATTEMPTS = 3; // 최대 허용 가입 시도 횟수

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 지원해요.' });

  const supabaseUrl = process.env.SUPABASE_URL || 'https://awlcdgbcwxthwryzkhia.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    // 서버 설정이 안 되어 있으면 제한 없이 통과시킨다(가입 자체가 막히는 것보다 낫다).
    return res.status(200).json({ ok: true, note: 'rate-limit not configured' });
  }

  const ip =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  const authHeaders = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  };

  try {
    const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
    const countRes = await fetch(
      `${supabaseUrl}/rest/v1/signup_attempts?ip_address=eq.${encodeURIComponent(ip)}&created_at=gte.${since}&select=id`,
      { headers: { ...authHeaders, Prefer: 'count=exact' } }
    );
    if (!countRes.ok) throw new Error('가입 시도 조회에 실패했어요.');
    const rows = await countRes.json();

    if (rows.length >= MAX_ATTEMPTS) {
      return res.status(429).json({
        error: `짧은 시간에 너무 많은 계정을 만들려고 했어요. ${WINDOW_MINUTES}분 후 다시 시도해주세요.`,
      });
    }

    // 이번 시도를 기록
    await fetch(`${supabaseUrl}/rest/v1/signup_attempts`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ ip_address: ip }),
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    // 제한 체크 자체가 실패해도 가입까지 막지는 않는다.
    return res.status(200).json({ ok: true, note: 'rate-limit check failed, allowing' });
  }
}
