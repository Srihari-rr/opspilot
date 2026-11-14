import OrbitVisual from '../components/OrbitVisual'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Loader2, CheckCircle2, Clock, Database, Plus, Siren, Volume2, Square, FileDown } from 'lucide-react'
import { canSpeak, speak, stopSpeak } from '../voice'
import { downloadReport, reportText } from '../report'
import { api, openStream, inr } from '../api'
import { AGENTS, ORDER } from '../agents'
import EventBody from '../components/EventBody'
import ApprovalPanel from '../components/ApprovalPanel'
import CountUp from '../components/CountUp'

export default function RunView() {
  const { id } = useParams()
  const nav = useNavigate()
  const [run, setRun] = useState(null)
  const [events, setEvents] = useState([])
  const [actions, setActions] = useState([])
  const endRef = useRef(null)
  const [talking, setTalking] = useState(false)
  useEffect(() => () => stopSpeak(), [])

  const refresh = () => api.get(`/runs/${id}`).then((r) => { setRun(r.data); setActions(r.data.actions) }).catch(() => {})

  useEffect(() => {
    setEvents([]); refresh()
    const es = openStream(id, (e) => {
      setEvents((prev) => (prev.some((x) => x.id === e.id) ? prev : [...prev, e]))
      if (['approval', 'summary', 'status', 'error'].includes(e.type) || e.agent === 'guardian') refresh()
    })
    return () => es.close()
  }, [id])

  // Safety net: if the live stream is blocked by a proxy/firewall, poll the run every 2s until it finishes.
  useEffect(() => {
    const t = setInterval(() => {
      api.get(`/runs/${id}`).then((r) => {
        setRun(r.data); setActions(r.data.actions)
        setEvents((prev) => { const known = new Set(prev.map((x) => x.id)); const add = (r.data.events || []).filter((x) => !known.has(x.id)); return add.length ? [...prev, ...add].sort((x, y) => x.id - y.id) : prev })
      }).catch(() => {})
    }, 2000)
    return () => clearInterval(t)
  }, [id])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [events.length, run?.status])

  const status = run?.status
  const lastAgent = [...events].reverse().find((e) => e.agent !== 'system')?.agent
  const idxLast = ORDER.indexOf(lastAgent)
  const done = status === 'completed'
  const agentState = (a, i) => {
    if (done || i < idxLast) return 'done'
    if (i === idxLast) return status === 'awaiting_approval' ? 'waiting' : status === 'failed' ? 'idle' : 'active'
    return 'idle'
  }
  const incidentEv = events.find((e) => e.type === 'status')
  const summary = run?.summary
  const m = summary?.metrics

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
      <div className="space-y-4 min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/" className="text-sm text-stone-600 hover:text-stone-900">← Command Center</Link>
          <span className="text-stone-500">/</span><span className="text-sm text-stone-700">Run #{id}</span>
          <StatusPill status={status} />
          {run?.summary?.autonomy && <span className="upper !text-[10px] border border-stone-900/25 px-2 py-1 text-stone-600">{run.summary.autonomy} mode</span>}
        </div>
        <div className="prog"><i style={{ width: `${Math.min(100, ((done ? ORDER.length : Math.max(0, idxLast) + 0.5) / ORDER.length) * 100)}%` }} /></div>
        <div className="glass p-4 flex gap-3 items-start">
          <Siren className="text-rose-700 shrink-0 mt-0.5" size={20} />
          <div><div className="text-[11px] uppercase tracking-wider text-stone-500">Incident</div><div className="font-medium">{run?.incident || incidentEv?.data?.incident}</div></div>
        </div>

        <div className="space-y-3 rail">
          {events.filter((e) => !(e.agent === 'system')).map((e) => {
            const A = AGENTS[e.agent] || AGENTS.system; const Icon = A.icon
            const compact = e.type === 'action' || e.type === 'note'
            return (
              <div key={e.id} className={`fade-up flex gap-3 ${compact ? 'pl-5' : ''}`}>
                {!compact && <div className="avatar w-9 h-9 rounded-sm grid place-items-center shrink-0 mt-0.5" style={{ background: `linear-gradient(${A.color}38,${A.color}38),#f3f0eb`, color: A.color }}><Icon size={18} /></div>}
                <div className={`min-w-0 flex-1 ${compact ? 'py-0.5' : e.type === 'summary' ? 'glass-strong p-4 border-yellow-300/30' : 'glass p-4'}`}>
                  {!compact && <div className="flex items-center gap-2 mb-1.5"><span className="text-xs font-bold uppercase tracking-wider" style={{ color: A.color }}>{A.name}</span>
                    <span className="text-[11px] text-stone-500">{new Date(e.ts).toLocaleTimeString()}</span></div>}
                  <EventBody e={e} />
                </div>
              </div>
            )
          })}
          {(status === 'running') && <div className="panel-taupe py-5 px-6 flex items-center gap-6"><div className="w-28 shrink-0 orbitmini"><OrbitVisual speed={2.5} /></div><div><div className="serif text-2xl">The crew is working…</div><div className="text-stone-600 text-sm mt-1">Seven agents are planning, sourcing and acting. This takes about 25 seconds.</div></div></div>}
          {status === 'awaiting_approval' && <ApprovalPanel runId={id} actions={actions} onDone={refresh} />}
          {done && (
            <div className="flex flex-wrap gap-3 pt-2 fade-up">
              <Link to="/" className="btn btn-primary"><Plus size={16} />Run another scenario</Link>
              <Link to="/systems" className="btn btn-ghost"><Database size={16} />See what changed in the systems</Link>
              <button className="btn btn-ghost" onClick={() => downloadReport({ ...run, events, actions })}><FileDown size={16} />Download report</button>
              {canSpeak && <button className="btn btn-ghost" onClick={() => { if (talking) { stopSpeak(); setTalking(false) } else { speak(reportText(run)); setTalking(true); setTimeout(() => setTalking(false), 30000) } }}>{talking ? <Square size={14} /> : <Volume2 size={16} />}{talking ? 'Stop' : 'Read briefing aloud'}</button>}
            </div>
          )}
          {done && summary?.headline && /no action/i.test(summary.headline) && (
            <div className="glass-strong p-5 fade-up">
              <div className="serif text-2xl">Nothing left to fix</div>
              <p className="text-sm text-stone-600 mt-1">Earlier runs already protected these orders, so the crew found no shortage. To run this scenario again from a fresh start, reset the demo data.</p>
              <button className="btn btn-primary mt-4" onClick={async () => { await api.post('/reset'); nav('/') }}>Reset demo data and go back</button>
            </div>
          )}
          {status === 'failed' && <div className="text-rose-700">This run failed. Please start a new one.</div>}
          {status === 'interrupted' && <div className="text-amber-800">This run was interrupted by a server restart.</div>}
          <div ref={endRef} />
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24">
        <div className="glass p-4">
          <div className="text-xs uppercase tracking-wider text-stone-500 mb-3">The crew</div>
          <div className="space-y-1.5">
            {ORDER.map((k, i) => {
              const A = AGENTS[k]; const s = agentState(k, i); const Icon = A.icon
              return (
                <div key={k} className={`flex items-center gap-3 rounded-sm px-2.5 py-2 transition ${s === 'active' || s === 'waiting' ? 'bg-stone-900/5' : ''}`}>
                  <div className={`w-8 h-8 rounded-sm grid place-items-center ${s === 'active' ? 'pulse-ring' : ''}`} style={{ background: A.color + (s === 'idle' ? '12' : '28'), color: s === 'idle' ? '#64748b' : A.color, '--ring': A.color + '88' }}><Icon size={16} /></div>
                  <div className="flex-1 min-w-0"><div className={`text-sm font-semibold ${s === 'idle' ? 'text-stone-500' : ''}`}>{A.name}</div><div className="text-[11px] text-stone-500 truncate">{A.role}</div></div>
                  {s === 'done' && <CheckCircle2 size={16} className="text-emerald-700" />}
                  {s === 'active' && <Loader2 size={16} className="animate-spin" style={{ color: A.color }} />}
                  {s === 'waiting' && <Clock size={16} className="text-amber-800" />}
                </div>
              )
            })}
          </div>
        </div>

        {m && (
          <div className="glass-strong p-4 fade-up border-emerald-300/20">
            <div className="text-xs uppercase tracking-wider text-emerald-700 mb-3">Business impact</div>
            <div className="grid grid-cols-2 gap-2.5">
              <Impact big v={<CountUp to={m.orders_protected} />} l="Orders saved from delay" />
              <Impact big v={<CountUp to={m.revenue_protected} format={(n) => inr(n)} />} l="Revenue protected" />
              <Impact v={`${(m.manual_minutes_saved / 60).toFixed(1)} hrs`} l="Manual work replaced" />
              <Impact v={`${m.agent_seconds}s`} l="Crew time (excl. your review)" />
              <Impact v={`${m.po_placed} · ${inr(m.po_value)}`} l="Purchase orders" />
              <Impact v={m.emails_sent} l="Customers informed" />
              <Impact v={m.ai_calls ? `₹${m.ai_cost_inr}` : 'Rule engine'} l={m.ai_calls ? `AI cost (${m.ai_calls} Gemini calls)` : 'AI cost: none (offline mode)'} />
            </div>
            {m.still_late > 0 && <div className="text-xs text-amber-800 mt-3">{m.still_late} order(s) can't be saved by any supplier. They are escalated to account managers.</div>}
          </div>
        )}
      </aside>
    </div>
  )
}

const Impact = ({ v, l, big }) => (<div className="rounded-sm bg-stone-900/5 p-3"><div className={`font-extrabold ${big ? 'text-2xl grad-text' : 'text-base'}`}>{v}</div><div className="text-[11px] text-stone-600 mt-0.5 leading-tight">{l}</div></div>)

function StatusPill({ status }) {
  const map = { running: ['Running', 'bg-stone-400/30 text-stone-600'], awaiting_approval: ['Needs your approval', 'bg-amber-500/20 text-amber-800'], completed: ['Completed', 'bg-emerald-500/20 text-emerald-700'], failed: ['Failed', 'bg-rose-500/20 text-rose-700'], interrupted: ['Interrupted', 'bg-stone-900/10 text-stone-700'] }
  const [t, c] = map[status] || ['Loading', 'bg-stone-900/5 text-stone-700']
  return <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${c}`}>{t}</span>
}
