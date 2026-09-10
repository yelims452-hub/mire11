// Supabase 연결 설정
// 커넥터에서 Supabase 프로젝트가 연결되면 아래 두 값을 실제 값으로 교체하세요.
// 1) SUPABASE_URL: 프로젝트 설정 > API > Project URL
// 2) SUPABASE_ANON_KEY: 프로젝트 설정 > API > anon public key
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

let supabaseClient = null;
let supabaseReady = false;

async function initSupabase() {
  if (supabaseReady) return supabaseClient;
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL') {
    console.warn('Supabase가 아직 연결되지 않았습니다. supabase.js의 URL/KEY를 설정하세요.');
    return null;
  }
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  supabaseReady = true;
  return supabaseClient;
}

window.getSupabase = initSupabase;
