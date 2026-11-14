import { useEffect, useRef } from 'react'
import { AGENTS, ORDER } from '../agents'
import { CheckCircle2, Lock, Zap, Sparkles } from 'lucide-react'

// Spinning agents. Driven by JavaScript (not CSS animation) so it ALWAYS moves.
export default function OrbitVisual({ speed = 1 }) {
  const refs = useRef([])
  const ringRef = useRef(null)
  useEffect(() => {
    let raf, t0 = performance.now()
    const tick = (now) => {
      const sec = (now - t0) / 1000
      const base = (sec * speed / 9) * Math.PI * 2 // one full turn every 9 seconds
      refs.current.forEach((el, i) => {
        if (!el) return
        const a = base + (i * Math.PI * 2) / ORDER.length
        el.style.left = `${50 + 42 * Math.cos(a)}%`
        el.style.top = `${50 + 42 * Math.sin(a)}%`
      })
      if (ringRef.current) ringRef.current.style.transform = `translate(-50%,-50%) rotate(${-sec * 12}deg)`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    // fallback in case rAF is throttled
    const iv = setInterval(() => tick(performance.now()), 100)
    return () => { cancelAnimationFrame(raf); clearInterval(iv) }
  }, [])
  return (
    <div className="orbitwrap">
      <div className="glow" /><div ref={ringRef} className="ring r1" /><div className="ring r2" />
      {ORDER.map((k, i) => { const A = AGENTS[k]; const I = A.icon; return (
        <div key={k} ref={(el) => (refs.current[i] = el)} className="osat" style={{ color: A.color, left: '92%', top: '50%' }} title={A.name || k}>
          <I size={24} />
        </div>) })}
      <div className="core"><Sparkles size={40} /></div>
      <span className="tag tg1 flex items-center gap-1"><CheckCircle2 size={12} />5 orders saved</span>
      <span className="tag tg2 flex items-center gap-1"><Lock size={12} />needs approval</span>
      <span className="tag tg3 flex items-center gap-1"><Zap size={12} />25s to resolve</span>
    </div>
  )
}
