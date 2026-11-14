// Thin wrapper around the Gemini API. The key is read ONLY from backend env variables.
export const aiEnabled = () => Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());

export const aiStatus = { model: null, lastError: null, ok: 0, failed: 0 };
const CANDIDATES = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'];

async function callModel(model, system, prompt) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const base = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com';
    const res = await fetch(`${base}/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY.trim() },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
      }),
    });
    if (!res.ok) { const e = new Error(`Gemini ${res.status} (${model}): ${(await res.text()).replace(/\s+/g, ' ').slice(0, 220)}`); e.status = res.status; throw e; }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
    const parsed = JSON.parse(text.replace(/^```json|```$/g, '').trim());
    const um = data?.usageMetadata;
    if (parsed && typeof parsed === 'object') Object.defineProperty(parsed, '__usage', { value: { in: um?.promptTokenCount || 0, out: (um?.candidatesTokenCount || 0) + (um?.thoughtsTokenCount || 0) }, enumerable: false });
    return parsed;
  } finally {
    clearTimeout(timer);
  }
}

// Tries the configured model first, then newer ones. Remembers the one that works.
export async function askJSON({ system, prompt }) {
  if (!aiEnabled()) throw new Error('NO_KEY');
  const list = [...new Set([aiStatus.model, process.env.GEMINI_MODEL, ...CANDIDATES].filter(Boolean))];
  let last;
  for (const m of list) {
    try {
      const out = await callModel(m, system, prompt);
      aiStatus.model = m; aiStatus.ok++; aiStatus.lastError = null;
      return out;
    } catch (e) {
      last = e;
      aiStatus.lastError = String(e.message || e).slice(0, 300);
      // Bad key / quota: other models will fail the same way, stop early.
      if (e.status === 401 || e.status === 403 || e.status === 429 || (e.status === 400 && /API key/i.test(e.message))) break;
    }
  }
  aiStatus.failed++;
  throw last;
}
