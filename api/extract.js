// Vercel Serverless Function
// POST { url: "유튜브 또는 블로그 URL" } -> 구조화된 레시피 JSON 반환
// Gemini API를 사용해 유튜브는 영상 자체를, 블로그는 페이지 텍스트를 분석한다.

const RECIPE_SCHEMA_PROMPT = `당신은 유튜브 자막이나 블로그 본문에서 요리 정보를 정밀하게 추출하는 데이터 정제 전문가입니다.
불필요한 사담이나 인사말은 제거하고, 오직 레시피 핵심 정보만 아래 원칙에 따라 추출하세요.

[원칙]
1. 원본에 없는 재료/양념/과정을 임의로 지어내지 마세요.
2. category는 반드시 ["한식","일식","양식","중식","아시안","베이킹/디저트","기타"] 중 하나.
3. tags는 핵심 키워드 3~5개 배열.
4. ingredients는 [{ "name": "재료명", "amount": "계량 또는 null" }] 형태.
5. instructions는 순서대로 명령조 문장 배열.
6. 반드시 아래 JSON 구조로만 출력하세요. 다른 설명 문구는 절대 포함하지 마세요.

{
  "recipe_name": "요리 이름",
  "category": "카테고리명",
  "tags": ["태그1","태그2","태그3"],
  "duration": "예상 소요시간 또는 null",
  "ingredients": [{ "name": "재료명", "amount": "계량 또는 null" }],
  "instructions": ["1단계 설명", "2단계 설명"],
  "tips": "팁 또는 null"
}`;

function isYoutubeUrl(url) {
  return /(?:youtube\.com|youtu\.be)/i.test(url);
}

function extractJson(text) {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('AI 응답에서 JSON을 찾지 못했어요.');
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function callGeminiApi(endpoint, body, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) return res.json();
    const errText = await res.text();
    const retriable = res.status === 503 || res.status === 429;
    if (!retriable || attempt === retries) {
      throw new Error(`Gemini API 오류 (${res.status}): ${errText.slice(0, 300)}`);
    }
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }
}

async function callGeminiWithYoutube(apiKey, url) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
  const body = {
    contents: [
      {
        parts: [
          { file_data: { file_uri: url, mime_type: 'video/*' } },
          { text: RECIPE_SCHEMA_PROMPT },
        ],
      },
    ],
  };
  const data = await callGeminiApi(endpoint, body);
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('AI가 응답을 생성하지 못했어요.');
  return text;
}

async function fetchPageText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RecipeExtractor/1.0)' },
  });
  if (!res.ok) throw new Error(`페이지를 불러오지 못했어요 (${res.status}).`);
  const html = await res.text();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, 15000);
}

async function callGeminiWithText(apiKey, pageText, sourceUrl) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
  const body = {
    contents: [
      {
        parts: [
          { text: `${RECIPE_SCHEMA_PROMPT}\n\n[출처 URL]: ${sourceUrl}\n[원본 텍스트]:\n${pageText}` },
        ],
      },
    ],
  };
  const data = await callGeminiApi(endpoint, body);
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('AI가 응답을 생성하지 못했어요.');
  return text;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 지원해요.' });

  const { url } = req.body || {};
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url이 필요해요.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: '서버에 GEMINI_API_KEY가 설정되어 있지 않아요.' });
  }

  try {
    let rawText;
    if (isYoutubeUrl(url)) {
      rawText = await callGeminiWithYoutube(apiKey, url);
    } else {
      const pageText = await fetchPageText(url);
      rawText = await callGeminiWithText(apiKey, pageText, url);
    }
    const recipe = extractJson(rawText);
    recipe.source_url = url;
    return res.status(200).json(recipe);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || '분석 중 문제가 발생했어요.' });
  }
}
