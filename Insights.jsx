import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, TrendingUp, Clock3, Gauge, PackageCheck } from 'lucide-react'
import { api, inr, errMsg } from '../api'
import { getAutonomy } from '../components/Autonomy'
import CountUp from '../components/CountUp'

const riskColor = (r) => (r >= 60 ? '#a8453f' : r >= 35 ? '#b08a3e' : '#5f8a6a')

function Bars({ series, pick, fmt, color = '#2b2824' }) {
  const max = Math.max(1, ...series.map(pick))
  return (
    <div className="flex items-end gap-3 h-52 pt-6">
      {series.map((r) => (
        <div key={r.id} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full group">
          <div className="text-[11px] text-stone-600 mb-1 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">{fmt(pick(r))}</div>
          <div className="w-full max-w-[56px] transition-all duration-700" style={{ height: `${Math.max(4, (pick(r) / max) * 100)}%`, background: color }} title={r.incident} />
          <div className="upper !text-[10px] text-stone-500 mt-2">{r.label}</div>
        </div>))}
    </div>
  )
}

export default function Insights() {
  const nav = useNavigate()
  const [a, setA] = useState(null)
  const [sg, setSg] = useState(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => { api.get('/insights').then((r) => setA(r.data)); api.get('/signals').then((r) => setSg(r.data)) }, [])
  if (!a) return <div className="text-stone-600">Loading…</div>
  const t = a.totals
  const gv = a.governance || { auto: 0, human_approved: 0, rejected: 0 }
  const gtotal = gv.auto + gv.human_approved + gv.rejected
  const empty = t.runs === 0
  const start = async () => {
    setBusy(true)
    try { const r = await api.post('/runs', { incident: 'Port strike: Apex Components (Shenzhen) shipments are delayed by 9 days.', autonomy: getAutonomy() }); nav(`/runs/${r.data.id}`) } catch (e) { alert(errMsg(e)); setBusy(false) }
  }
  const cards = [
    [TrendingUp, 'Revenue protected', <CountUp to={t.revenue} format={(n) => inr(n)} />],
    [PackageCheck, 'Orders saved from delay', <CountUp to={t.orders} />],
    [Clock3, 'Manual hours replaced', <CountUp to={t.hours} format={(n) => n.toFixed(1)} />],
    [Gauge, 'Crew time vs manual time', <><CountUp to={t.speedup} />×</>],
  ]
  return (
    <div className="space-y-12">
      <div>
        <div className="upper text-stone-500 mb-2">Impact analytics</div>
        <h1 className="text-5xl leading-tight">What the crew has <span className="grad-text">delivered</span></h1>
        <p className="text-stone-600 mt-3 max-w-xl">Every run is measured: revenue protected, time saved, and how the work compares with doing it by hand.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(([I, l, v]) => (
          <div key={l} className="glass-strong p-5"><I size={20} strokeWidth={1.3} className="text-stone-600" /><div className="serif text-4xl md:text-5xl mt-3">{v}</div><div className="upper !text-[10px] text-stone-500 mt-1">{l}</div></div>))}
      </div>

      {empty ? (
        <div className="glass p-10 text-center">
          <h2 className="text-3xl">No completed runs yet</h2>
          <p className="text-stone-600 mt-2">Run a scenario and your charts appear here automatically.</p>
          <button className="btn btn-primary mt-6" disabled={busy} onClick={start}>Run a sample scenario <ArrowRight size={14} /></button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="glass p-6"><h2 className="text-2xl">Revenue protected per run</h2><Bars series={a.series} pick={(r) => r.revenue} fmt={inr} /></div>
          <div className="glass p-6"><h2 className="text-2xl">Manual minutes replaced per run</h2><Bars series={a.series} pick={(r) => r.minutes} fmt={(n) => `${n} min`} color="#8a7a62" /></div>
          <div className="glass p-6 lg:col-span-2">
            <h2 className="text-2xl">Crew versus doing it by hand</h2>
            <div className="mt-6 space-y-5">
              {[['Manual team', t.minutes * 60, '#a8453f', `${t.hours} hours`], ['OpsPilot crew', Math.max(20 * t.runs, t.agent_seconds), '#2b2824', `${Math.max(20 * t.runs, t.agent_seconds)} seconds`]].map(([l, v, c, txt]) => {
                const max = t.minutes * 60
                return (<div key={l}><div className="flex justify-between text-sm mb-1.5"><span>{l}</span><span className="text-stone-600">{txt}</span></div><div className="h-3 bg-stone-900/10"><div className="h-full transition-all duration-1000" style={{ width: `${Math.max(1.5, (v / max) * 100)}%`, background: c }} /></div></div>)
              })}
            </div>
            <div className="grid grid-cols-3 gap-3 mt-7 text-center">
              {[[t.emails, 'Customer emails sent'], [t.tickets, 'Escalation tickets'], [inr(t.po_value), 'Purchase orders placed']].map(([n, l]) => <div key={l} className="border border-stone-900/15 py-4"><div className="serif text-3xl">{n}</div><div className="upper !text-[10px] text-stone-500 mt-1">{l}</div></div>)}
            </div>
          </div>
        </div>
      )}

      <div className="glass p-6">
        <h2 className="text-2xl">Detect to resolve: industry versus OpsPilot</h2>
        <p className="text-sm text-stone-600 mt-1">Industry average from Sphera (2026): 8.7 hours to detect a disruption and more than 40 hours to understand its impact.</p>
        <div className="mt-6 space-y-5">
          {[['Typical company (detect + understand impact)', 100, '#a8453f', '48.7 hours'], ['OpsPilot (detect + analyse + act)', 0.9, '#2b2824', 'under 2 minutes']].map(([l, w, c, txt]) => (
            <div key={l}><div className="flex justify-between text-sm mb-1.5"><span>{l}</span><span className="text-stone-600">{txt}</span></div><div className="h-3 bg-stone-900/10"><div className="h-full" style={{ width: `${w}%`, background: c }} /></div></div>))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass p-6">
          <h2 className="text-2xl">Governance scorecard</h2>
          <p className="text-sm text-stone-600 mt-1">How the Guardian handled every action so far. Proportional control, not all or nothing.</p>
          <div className="grid grid-cols-3 gap-3 mt-5 text-center">
            {[[gv.auto, 'Auto-approved (safe)'], [gv.human_approved, 'Approved by a human'], [gv.rejected, 'Rejected by a human']].map(([n, l]) => <div key={l} className="border border-stone-900/15 py-5"><div className="serif text-4xl">{n}</div><div className="upper !text-[10px] text-stone-500 mt-1 px-1">{l}</div></div>)}
          </div>
          {gtotal > 0 && <div className="flex h-3 mt-5 overflow-hidden"><i style={{ width: `${(gv.auto / gtotal) * 100}%`, background: '#5f8a6a' }} /><i style={{ width: `${(gv.human_approved / gtotal) * 100}%`, background: '#b08a3e' }} /><i style={{ width: `${(gv.rejected / gtotal) * 100}%`, background: '#a8453f' }} /></div>}
        </div>
        <div className="glass p-6">
          <h2 className="text-2xl">Cost per resolved incident</h2>
          <p className="text-sm text-stone-600 mt-1">Gartner says unclear cost and value kill agentic projects. Ours is measured on every run.</p>
          <div className="grid grid-cols-2 gap-3 mt-5 text-center">
            <div className="border border-stone-900/15 py-5"><div className="serif text-4xl">{t.runs ? inr(t.manual_cost / t.runs) : '-'}</div><div className="upper !text-[10px] text-stone-500 mt-1">Manual team (at ₹500 / hour)</div></div>
            <div className="border border-stone-900 bg-stone-900 text-stone-100 py-5"><div className="serif text-4xl">{t.runs ? `₹${(t.ai_cost / t.runs).toFixed(2)}` : '-'}</div><div className="upper !text-[10px] text-stone-300 mt-1">AI crew ({t.ai_calls ? `${t.ai_calls} Gemini calls` : 'rule engine'})</div></div>
          </div>
        </div>
      </div>

      <div className="glass p-6">
        <div className="flex flex-wrap justify-between gap-2"><h2 className="text-2xl">Supplier risk board</h2><span className="text-xs text-stone-500 self-end">AI risk score, 0 (safe) to 100 (critical)</span></div>
        <div className="mt-5 space-y-3.5">
          {(sg?.suppliers || []).map((s) => (
            <div key={s.id} className="grid grid-cols-[130px_1fr_46px] sm:grid-cols-[190px_1fr_60px] items-center gap-3 text-sm">
              <div className="truncate">{s.name}<div className="text-[10px] text-stone-500">{s.city} · {s.reliability}% reliable</div></div>
              <div className="h-2.5 bg-stone-900/10"><div className="h-full transition-all duration-1000" style={{ width: `${s.risk}%`, background: riskColor(s.risk) }} /></div>
              <div className="text-right serif text-xl" style={{ color: riskColor(s.risk) }}>{s.risk}</div>
            </div>))}
        </div>
      </div>
    </div>
  )
}
