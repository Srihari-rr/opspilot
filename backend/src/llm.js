// Thin wrapper around the Gemini API. The key is read ONLY from backend env variables.
export const aiEnabled = () => Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());

export async function askJSON({ system, prompt }) {
  if (!aiEnabled()) throw new Error('NO_KEY');
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
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
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
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
