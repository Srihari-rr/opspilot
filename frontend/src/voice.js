// Browser voice features (Web Speech API). Works in Chrome/Edge/Safari. Degrades gracefully elsewhere.
const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null
export const canListen = Boolean(SR)
export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

export function listen({ onText, onEnd, onError }) {
  if (!SR) { onError?.('Voice input is not supported in this browser. Try Chrome or Edge.'); return { stop() {} } }
  const r = new SR()
  r.lang = 'en-IN'; r.interimResults = true; r.continuous = false
  r.onresult = (e) => onText(Array.from(e.results).map((x) => x[0].transcript).join(' '))
  r.onerror = (e) => onError?.(e.error === 'not-allowed' ? 'Microphone permission was blocked.' : 'Could not hear you. Please try again.')
  r.onend = () => onEnd?.()
  try { r.start() } catch { onEnd?.() }
  return { stop: () => { try { r.stop() } catch {} } }
}

export function speak(text) {
  if (!canSpeak) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(String(text).replace(/[•₹]/g, (c) => (c === '₹' ? ' rupees ' : ', ')))
  const v = window.speechSynthesis.getVoices()
  u.voice = v.find((x) => /en-IN/i.test(x.lang)) || v.find((x) => /^en/i.test(x.lang)) || null
  u.rate = 1.02
  window.speechSynthesis.speak(u)
}
export const stopSpeak = () => canSpeak && window.speechSynthesis.cancel()
