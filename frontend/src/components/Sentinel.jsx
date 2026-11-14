import { Radar, ArrowRight, Radio } from 'lucide-react'
import { inr } from '../api'

const SEV = { high: 'bg-rose-500/15 text-rose-800 border-rose-700/30', medium: 'bg-amber-500/15 text-amber-800 border-amber-700/30', low: 'bg-stone-900/5 text-stone-700 border-stone-900/20' }
const ago = (m) => (m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`)

export default function Sentinel({ signals, onHandle, busy }) {
  return (
    <section id="sentinel" className="scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <div className="upper text-stone-500 mb-2 flex items-center gap-2"><span className="relative flex w-2 h-2"><span className="absolute inset-0 rounded-full bg-emerald-600 animate-ping opacity-70" /><span className="relative w-2 h-2 rounded-full bg-emerald-600" /></span>Sentinel agent · scanning 24/7</div>
          <h2 className="text-4xl md:text-5xl leading-tight">Risks it found <span className="grad-text">before you did</span></h2>
        </div>
        <p className="text-sm text-stone-600 max-w-sm">The Sentinel watches weather, port, quality and supplier feeds, scores each threat against your real orders, and hands the worst ones to the crew.</p>
      </div>
      {!signals ? <div className="text-stone-500 text-sm">Scanning…</div> : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {signals.map((s) => (
            <div key={s.id} className="glass p-5 flex flex-col">
              <div className="flex items-center justify-between gap-2">
                <span className="flex gap-1.5"><span className={`upper !text-[10px] border px-2 py-0.5 ${SEV[s.severity]}`}>{s.severity} risk</span>{s.tier === 3 && <span className="upper !text-[10px] border px-2 py-0.5 bg-stone-900 text-stone-100 border-stone-900">Tier 3 · hidden</span>}</span>
                <span className="text-[11px] text-stone-500 flex items-center gap-1"><Radio size={11} />{ago(s.mins)}</span>
              </div>
              <h3 className="text-2xl leading-tight mt-4">{s.title}</h3>
              <div className="text-xs text-stone-500 mt-1">{s.supplier} · {s.city}</div>
              <p className="text-sm text-stone-600 mt-3 leading-relaxed flex-1">{s.detail}</p>
              <div className="mt-4">
                <div className="flex justify-between text-[11px] text-stone-500 mb-1"><span>AI confidence</span><span>{Math.round(s.confidence * 100)}%</span></div>
                <div className="prog"><i style={{ width: `${s.confidence * 100}%` }} /></div>
              </div>
              <div className="mt-4 text-sm border-t border-stone-900/15 pt-3">
                {s.exposure.orders > 0
                  ? <><b>{s.exposure.orders} order{s.exposure.orders > 1 ? 's' : ''}</b> at risk · <b>{inr(s.exposure.value)}</b></>
                  : s.exposure.backupFor.length ? <span className="text-stone-600">Backup supplier for {s.exposure.backupFor.join(', ')}. Resilience is reduced.</span>
                  : <span className="text-stone-600">No open orders affected right now.</span>}
              </div>
              <div className="text-[10px] text-stone-400 mt-1 upper">{s.source}</div>
              <button disabled={busy} onClick={() => onHandle(s.incident)} className="btn btn-primary justify-center mt-4 disabled:opacity-50"><Radar size={14} />Let the crew handle it<ArrowRight size={14} /></button>
            </div>))}
        </div>)}
    </section>
  )
}
