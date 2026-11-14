import { CheckCircle2, Lock, Wrench, AlertTriangle, SkipForward, Clock, Star } from 'lucide-react'
import { inr } from '../api'

const Badge = ({ children, c = 'slate' }) => {
  const m = { slate: 'bg-stone-900/5 text-stone-800', red: 'bg-rose-500/20 text-rose-700', amber: 'bg-amber-500/20 text-amber-800', green: 'bg-emerald-500/20 text-emerald-700', violet: 'bg-stone-400/30 text-stone-600', cyan: 'bg-cyan-500/20 text-cyan-800' }
  return <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${m[c]}`}>{children}</span>
}
const Stat = ({ l, v }) => (<div className="rounded-sm bg-stone-900/5 px-3 py-2"><div className="text-lg font-bold">{v}</div><div className="text-[11px] text-stone-600">{l}</div></div>)

export default function EventBody({ e }) {
  const d = e.data || {}
  if (e.type === 'thought') return <div className="text-stone-700 italic">{e.title}<span className="dots" /></div>
  if (e.type === 'note') return <div className="text-amber-800 flex items-center gap-2 text-sm"><AlertTriangle size={14} />{e.title}</div>

  if (e.type === 'tool') return (
    <div>
      <div className="inline-flex items-center gap-2 font-mono text-[13px] text-cyan-800 bg-cyan-400/10 border border-cyan-400/20 rounded-sm px-2.5 py-1"><Wrench size={13} />{e.title}</div>
      {d.products && <div className="mt-2 grid sm:grid-cols-2 gap-2">{d.products.map((p) => <div key={p.product} className="text-xs bg-stone-900/5 rounded-sm px-3 py-2 flex justify-between"><span>{p.product}</span><span className="text-stone-600">stock {p.stock} · usable <b className={p.usable === 0 ? 'text-rose-700' : 'text-emerald-700'}>{p.usable}</b></span></div>)}</div>}
      {d.candidates && <div className="mt-2 space-y-1">{d.candidates.map((c) => <div key={c.supplier_id} className="text-xs bg-stone-900/5 rounded-sm px-3 py-1.5 flex flex-wrap gap-x-4 justify-between"><b>{c.name} <span className="font-normal text-stone-600">({c.city})</span></b><span className="text-stone-700">{inr(c.unit_cost)}/unit · {c.lead_days}d lead · {(c.reliability * 100).toFixed(0)}% reliable</span></div>)}</div>}
      {d.delay_days && <div className="text-xs text-stone-600 mt-1.5">Simulating a {d.delay_days}-day disruption{d.blocked_stock ? ' with all existing stock quarantined' : ''}</div>}
    </div>
  )

  if (e.agent === 'planner' && e.type === 'result') return (
    <div>
      <div className="font-semibold">{e.title}</div>
      <p className="text-stone-700 text-sm mt-1">{d.summary}</p>
      <div className="flex flex-wrap gap-2 mt-2"><Badge c="violet">{d.supplier_name}</Badge><Badge>{d.disruption_type}</Badge><Badge c="amber">{d.delay_days} days</Badge><Badge c={d.severity === 'critical' ? 'red' : 'amber'}>severity: {d.severity}</Badge></div>
    </div>
  )
  if (e.type === 'plan') return (
    <div><div className="font-semibold mb-2">{e.title}</div>
      <ol className="space-y-1.5">{d.steps.map((s, i) => <li key={i} className="flex gap-3 text-sm text-stone-700"><span className="w-5 h-5 rounded-full bg-stone-400/30 text-stone-600 text-xs grid place-items-center shrink-0 mt-0.5">{i + 1}</span>{s}</li>)}</ol></div>
  )

  if (e.agent === 'analyst' && e.type === 'result') return (
    <div>
      <div className="font-semibold">{e.title}</div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3"><Stat l="Orders affected" v={d.openOrdersAffected} /><Stat l="Short on stock" v={d.ordersShort} /><Stat l="Late if no action" v={d.ordersLateIfNoAction} /><Stat l="Revenue exposed" v={inr(d.revenueExposed)} /></div>
      <ul className="mt-3 space-y-1">{(d.insights || []).map((s, i) => <li key={i} className="text-sm text-stone-700 flex gap-2"><span className="text-stone-600">▸</span>{s}</li>)}</ul>
    </div>
  )

  if (e.agent === 'sourcing' && e.type === 'result') return (
    <div>
      <div className="font-semibold">{e.title}</div>
      <div className="space-y-2 mt-3">{d.purchase_orders.map((p) => (
        <div key={p.product_id} className="rounded-sm bg-amber-400/[.07] border border-amber-400/20 p-3">
          <div className="flex flex-wrap justify-between gap-2"><b>{p.qty} × {p.product}</b><span className="font-bold text-amber-800">{inr(p.total)}</span></div>
          <div className="text-sm text-stone-700">from <b>{p.supplier}</b> · arrives in {p.eta_days} days · {(p.reliability * 100).toFixed(0)}% reliable{p.premium > 0.005 && <> · +{(p.premium * 100).toFixed(0)}% price premium</>}</div>
          <div className="text-xs text-stone-600 mt-1 italic">“{p.reasoning}”</div>
        </div>))}</div>
      {d.source && <div className="text-[11px] text-stone-500 mt-2">decision engine: {d.source === 'gemini' ? 'Gemini reasoning' : 'rule-based fallback'}</div>}
    </div>
  )

  if (e.agent === 'guardian' && e.type === 'result' && d.actions) return (
    <div>
      <div className="font-semibold">{e.title}</div>
      <div className="flex flex-wrap gap-1.5 mt-2.5">{d.actions.map((a) => (
        <span key={a.id} className={`text-xs px-2 py-1 rounded-md inline-flex items-center gap-1 ${a.needs_approval ? 'bg-amber-500/20 text-amber-800' : 'bg-emerald-500/15 text-emerald-700'}`}>
          {a.needs_approval ? <Lock size={11} /> : <CheckCircle2 size={11} />}{a.type.replace('_', ' ').toLowerCase()}</span>))}</div>
      <div className="text-xs text-stone-500 mt-2">Policy is enforced by deterministic rules, not by the AI, so risky actions can never slip through.</div>
    </div>
  )
  if (e.type === 'approval') return <div className="text-amber-800 flex items-center gap-2 font-medium"><Clock size={16} />Paused. Waiting for a human to decide...</div>

  if (e.type === 'action') return (
    <div className={`flex items-start gap-2 text-sm ${d.status === 'skipped' ? 'text-stone-500' : 'text-stone-800'}`}>
      {d.status === 'skipped' ? <SkipForward size={15} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={15} className="text-emerald-700 mt-0.5 shrink-0" />}<span>{e.title}</span></div>
  )
  if (e.type === 'summary') return (
    <div><div className="flex items-center gap-2 text-amber-800 font-bold"><Star size={16} />{e.title}</div>
      {d.narrative && <p className="text-sm text-stone-700 mt-2 leading-relaxed">{d.narrative}</p>}
      {d.next_steps?.length > 0 && <ul className="mt-3 space-y-1">{d.next_steps.map((s, i) => <li key={i} className="text-sm text-stone-700 flex gap-2"><span className="text-sky-700">→</span>{s}</li>)}</ul>}</div>
  )
  return <div className="text-sm text-stone-800">{e.title}</div>
}
