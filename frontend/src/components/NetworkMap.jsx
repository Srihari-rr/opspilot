import { useMemo, useState } from 'react'
import { inr } from '../api'

const riskColor = (r) => (r >= 60 ? '#a8453f' : r >= 35 ? '#b08a3e' : '#5f8a6a')

// Live supply-network graph: suppliers -> your factory -> customers. Node colour = AI risk score.
export default function NetworkMap({ data, risks }) {
  const [hover, setHover] = useState(null)
  const g = useMemo(() => {
    if (!data) return null
    const rk = Object.fromEntries((risks || []).map((r) => [r.id, r]))
    const W = 980, H = 470, hub = { x: W / 2, y: H / 2 }
    const sups = data.suppliers.map((s, i) => ({ ...s, x: 200, y: 40 + (i * (H - 80)) / Math.max(1, data.suppliers.length - 1), risk: rk[s.id]?.risk ?? 10, sig: rk[s.id]?.signal }))
    const custMap = {}
    data.orders.forEach((o) => { custMap[o.customer] = (custMap[o.customer] || 0) + o.value })
    const custs = Object.entries(custMap).sort((a, b) => b[1] - a[1]).map(([name, value], i, a) => ({ name, value, x: W - 200, y: 55 + (i * (H - 110)) / Math.max(1, a.length - 1) }))
    const prim = {}; data.products.forEach((p) => { prim[p.primary_supplier] = (prim[p.primary_supplier] || 0) + data.orders.filter((o) => o.product_id === p.id).reduce((t, o) => t + o.value, 0) })
    const poSup = new Set((data.purchase_orders || []).map((p) => p.supplier_id))
    const maxV = Math.max(1, ...Object.values(prim), ...custs.map((c) => c.value))
    return { W, H, hub, sups, custs, prim, poSup, maxV }
  }, [data, risks])
  if (!g) return null
  const { W, H, hub, sups, custs, prim, poSup, maxV } = g
  const sw = (v) => 1 + (v / maxV) * 5

  return (
    <section id="network" className="scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <div className="upper text-stone-500 mb-2">Live supply network</div>
          <h2 className="text-4xl md:text-5xl leading-tight">Your business, <span className="grad-text">mapped</span></h2>
        </div>
        <div className="flex gap-4 text-[11px] text-stone-600 items-center">
          {[['#5f8a6a', 'Healthy'], ['#b08a3e', 'Watch'], ['#a8453f', 'At risk']].map(([c, l]) => <span key={l} className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />{l}</span>)}
          <span className="flex items-center gap-1.5"><i className="w-4 border-t border-dashed border-stone-500" />Backup route</span>
        </div>
      </div>
      <div className="glass overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[640px]" role="img" aria-label="Supply network">
          {/* supplier -> hub */}
          {sups.map((s) => {
            const v = prim[s.id]; const c = riskColor(s.risk)
            return <line key={'a' + s.id} x1={s.x + 14} y1={s.y} x2={hub.x - 62} y2={hub.y} stroke={v ? c : '#b0a692'} strokeWidth={v ? sw(v) : 1} strokeDasharray={v ? '5 7' : '3 6'} opacity={hover && hover !== s.id ? 0.15 : v ? 0.75 : 0.5} className={v ? 'flow' : ''} />
          })}
          {/* hub -> customers */}
          {custs.map((c) => <line key={'b' + c.name} x1={hub.x + 62} y1={hub.y} x2={c.x - 14} y2={c.y} stroke="#4a4844" strokeWidth={sw(c.value)} strokeDasharray="5 7" opacity={hover ? 0.15 : 0.45} className="flow" />)}
          {/* hub */}
          <circle cx={hub.x} cy={hub.y} r="62" fill="#2b2824" />
          <circle cx={hub.x} cy={hub.y} r="74" fill="none" stroke="#2b2824" strokeDasharray="2 5" opacity=".5" />
          <text x={hub.x} y={hub.y - 2} textAnchor="middle" fill="#f3f0eb" fontSize="17" fontFamily="Cormorant Garamond, Georgia, serif">Your</text>
          <text x={hub.x} y={hub.y + 17} textAnchor="middle" fill="#f3f0eb" fontSize="17" fontFamily="Cormorant Garamond, Georgia, serif">Factory</text>
          {/* suppliers */}
          {sups.map((s) => {
            const c = riskColor(s.risk)
            return (
              <g key={s.id} onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(null)} style={{ cursor: 'default' }}>
                {s.sig && <circle cx={s.x} cy={s.y} r="14" fill="none" stroke={c} strokeWidth="2" className="ping" />}
                <circle cx={s.x} cy={s.y} r="12" fill="#f3f0eb" stroke={c} strokeWidth="2.5" />
                <text x={s.x} y={s.y + 4} textAnchor="middle" fontSize="10" fontWeight="600" fill={c}>{s.risk}</text>
                <text x={s.x - 24} y={s.y - 2} textAnchor="end" fontSize="13" fill="#2b2824">{s.name}</text>
                <text x={s.x - 24} y={s.y + 13} textAnchor="end" fontSize="10" fill="#8d857a">{s.city}{poSup.has(s.id) ? ' · PO placed' : ''}</text>
              </g>)
          })}
          {/* customers */}
          {custs.map((c) => (
            <g key={c.name}>
              <rect x={c.x - 12} y={c.y - 12} width="24" height="24" fill="#f3f0eb" stroke="#4a4844" strokeWidth="1.5" />
              <text x={c.x + 24} y={c.y - 2} fontSize="13" fill="#2b2824">{c.name}</text>
              <text x={c.x + 24} y={c.y + 13} fontSize="10" fill="#8d857a">{inr(c.value)} open</text>
            </g>))}
        </svg>
      </div>
      <p className="text-xs text-stone-500 mt-3">Number inside each supplier circle = AI risk score (0 to 100), based on reliability, open order value and live Sentinel signals. Pulsing rings mean an active signal.</p>
    </section>
  )
}
