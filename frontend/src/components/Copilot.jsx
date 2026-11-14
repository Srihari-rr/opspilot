import { useEffect, useRef, useState } from 'react'
import { MessageSquareText, X, Send, Mic, Volume2, VolumeX, Sparkles } from 'lucide-react'
import { api, errMsg } from '../api'
import { canListen, canSpeak, listen, speak, stopSpeak } from '../voice'

const SUGGEST = ['What is my biggest risk?', 'Which supplier is least reliable?', 'How is my stock?', 'Top customers by value', 'What has the crew saved so far?']

export default function Copilot() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState([{ from: 'ai', text: 'Hello! I am your Copilot. Ask me anything about your suppliers, orders, stock or risks. You can also use the microphone.' }])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [mic, setMic] = useState(false)
  const [talk, setTalk] = useState(false)
  const end = useRef(null)
  const rec = useRef(null)
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [msgs, open])

  async function ask(text) {
    const question = (text ?? q).trim()
    if (question.length < 2 || busy) return
    setQ(''); setBusy(true); setMsgs((m) => [...m, { from: 'me', text: question }])
    try {
      const r = await api.post('/ask', { question })
      setMsgs((m) => [...m, { from: 'ai', text: r.data.answer, source: r.data.source }])
      if (talk) speak(r.data.answer)
    } catch (e) { setMsgs((m) => [...m, { from: 'ai', text: errMsg(e) }]) }
    setBusy(false)
  }
  function toggleMic() {
    if (mic) { rec.current?.stop(); return }
    setMic(true)
    rec.current = listen({ onText: setQ, onEnd: () => setMic(false), onError: (m) => { setMic(false); setMsgs((x) => [...x, { from: 'ai', text: m }]) } })
  }

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} aria-label="Open Copilot"
          className="fixed z-[60] right-4 md:right-6 bottom-24 md:bottom-6 flex items-center gap-2 bg-stone-900 text-stone-100 p-3.5 md:pl-4 md:pr-5 md:py-3 rounded-full md:rounded-none shadow-xl hover:bg-stone-700 transition">
          <MessageSquareText size={18} strokeWidth={1.5} /><span className="upper !text-[11px] hidden md:inline">Ask the crew</span>
        </button>)}
      {open && (
        <div className="fixed z-[70] right-0 md:right-6 bottom-0 md:bottom-6 w-full md:w-[390px] h-[78vh] md:h-[540px] bg-[#f3f0eb] border border-stone-900/30 shadow-2xl flex flex-col fade-up">
          <div className="flex items-center gap-3 px-5 py-3.5 bg-[#4a4844] text-stone-100">
            <Sparkles size={17} strokeWidth={1.5} />
            <div className="flex-1"><div className="serif text-xl leading-none">Ask the Crew</div><div className="upper !text-[9px] opacity-70 mt-1">Copilot · answers from your live data</div></div>
            {canSpeak && <button title="Read answers aloud" onClick={() => { setTalk(!talk); stopSpeak() }} className="p-1.5 hover:bg-white/10">{talk ? <Volume2 size={17} /> : <VolumeX size={17} className="opacity-60" />}</button>}
            <button onClick={() => { setOpen(false); stopSpeak() }} className="p-1.5 hover:bg-white/10"><X size={18} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'me' ? 'justify-end' : ''}`}>
                <div className={`max-w-[88%] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line ${m.from === 'me' ? 'bg-stone-900 text-stone-100' : 'bg-white border border-stone-900/15'}`}>
                  {m.text}
                  {m.source && <div className="upper !text-[9px] text-stone-400 mt-1.5">{m.source === 'gemini' ? 'Gemini AI' : 'Rule engine'}</div>}
                </div>
              </div>))}
            {busy && <div className="text-xs text-stone-500 dots">Thinking</div>}
            <div ref={end} />
          </div>
          <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto">
            {SUGGEST.map((s) => <button key={s} onClick={() => ask(s)} className="shrink-0 text-[11px] border border-stone-900/20 px-2.5 py-1 hover:bg-stone-900 hover:text-stone-100 transition">{s}</button>)}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); ask() }} className="p-3 border-t border-stone-900/15 flex gap-2">
            <input className="input !py-2.5" placeholder={mic ? 'Listening…' : 'Ask about risks, suppliers, stock…'} value={q} onChange={(e) => setQ(e.target.value)} />
            {canListen && <button type="button" onClick={toggleMic} title="Speak" className={`px-3 border ${mic ? 'bg-rose-600 text-white border-rose-600 pulse-ring' : 'border-stone-900/30'}`}><Mic size={17} /></button>}
            <button className="px-3.5 bg-stone-900 text-stone-100 disabled:opacity-40" disabled={busy || q.trim().length < 2}><Send size={16} /></button>
          </form>
        </div>)}
    </>
  )
}
