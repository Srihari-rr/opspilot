import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Ship, FlaskConical, Flame, Pencil, PackageOpen, IndianRupee, Truck, Activity, ArrowUpRight, ArrowRight, Play, Star, Bot, Zap, ShieldCheck,
  Brain, PackageSearch, Database, History as HistoryIcon, RotateCcw, Rocket, Crown, Check, Sparkles, Mic } from 'lucide-react'
import { api, errMsg, inr } from '../api'
import { store } from '../store'
import { AGENTS, ORDER } from '../agents'
import CountUp from '../components/CountUp'
import OrbitVisual from '../components/OrbitVisual'
import Problem from '../components/Problem'
import Sentinel from '../components/Sentinel'
import NetworkMap from '../components/NetworkMap'
import Autonomy, { getAutonomy } from '../components/Autonomy'
import { canListen, listen } from '../voice'

const PRESETS = [
  { icon: Ship, tag: 'Logistics', title: 'Port strike delays shipments', short: 'Port Strike',
    text: 'Port strike: Apex Components (Shenzhen) shipments are delayed by 9 days.' },
  { icon: FlaskConical, tag: 'Quality', title: 'Quality recall, stock quarantined', short: 'Recall',
    text: 'Quality recall: Nova Plastics casing batch failed QC, all existing stock is quarantined for 10 days.' },
  { icon: Flame, tag: 'Disaster', title: 'Factory fire cuts capacity', short: 'Factory Fire',
    text: 'Fire at Voltix Energy factory cuts capacity, battery pack shipments delayed by 6 days.' },
]
const FEATURES = [
  { icon: Brain, t: 'Plans & Reasons', d: 'Turns one incident into a clear step-by-step plan.' },
  { icon: PackageSearch, t: 'Smart Sourcing', d: 'Finds the best backup supplier within policy.' },
  { icon: ShieldCheck, t: 'Guardian Safety', d: 'Risky moves always wait for a human approval.' },
  { icon: Zap, t: 'Instant Execution', d: 'Acts across orders, email and tickets together.' },
]

export default function Dashboard() {
  const nav = useNavigate()
  const user = JSON.parse(store.get('user') || '{}')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [sys, setSys] = useState(null)
  const [runs, setRuns] = useState([])
  const [ai, setAi] = useState(null)
  const [sg, setSg] = useState(null)
  const [mic, setMic] = useState(false)

  const load = () => {
    api.get('/systems').then((r) => setSys(r.data)).catch(() => {})
    api.get('/runs').then((r) => setRuns(r.data)).catch(() => {})
    api.get('/signals').then((r) => setSg(r.data)).catch(() => {})
  }
  useEffect(() => { load(); api.get('/health').then((r) => setAi(r.data.ai)).catch(() => {}) }, [])

  async function launch(incident) {
    setErr(''); setBusy(true)
    try { const r = await api.post('/runs', { incident, autonomy: getAutonomy() }); nav(`/runs/${r.data.id}`) }
    catch (e) { setErr(errMsg(e)); setBusy(false) }
  }
  const speak = () => { if (mic) return; setMic(true); setErr(''); listen({ onText: setText, onEnd: () => setMic(false), onError: (m) => { setMic(false); setErr(m) } }) }
  const MicBtn = () => canListen && <button type="button" onClick={speak} title="Speak the incident" className={`px-4 border ${mic ? 'bg-rose-600 text-white border-rose-600 pulse-ring' : 'border-stone-900/30 hover:border-stone-900'}`}><Mic size={17} /></button>
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const val = sys ? sys.orders.reduce((s, o) => s + o.value, 0) : 0
  const kpis = [
    [PackageOpen, 'Orders in the system', sys ? <CountUp to={sys.orders.length} /> : '-'],
    [IndianRupee, 'Order value', sys ? <CountUp to={val} format={(n) => inr(n)} /> : '-'],
    [Truck, 'Active suppliers', sys ? <CountUp to={sys.suppliers.length} /> : '-'],
    [Activity, 'Crew runs so far', <CountUp to={runs.length} />],
  ]

  const customBox = () => (
    <section className="glass-strong p-5 md:p-7">
      <h2 className="text-2xl mb-3">Or describe your own incident <span className="text-sm text-stone-500 italic">(type or speak)</span></h2>
      <div className="flex flex-col md:flex-row gap-3">
        <input className="input flex-1" placeholder={mic ? 'Listening… speak the incident' : 'e.g. "Zenith Micro warehouse flooded, deliveries delayed by 7 days"'} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && text.length > 7 && launch(text)} />
        {MicBtn()}
        <button className="btn btn-primary justify-center" disabled={busy || text.length < 8} onClick={() => launch(text)}>{busy ? 'Starting...' : 'Run the crew'}<ArrowRight size={15} /></button>
      </div>
      {err && <div className="mt-3 text-sm text-rose-700">{err}</div>}
    </section>
  )

  const banner = () => (
    <section className="bg-[#4a4844] text-stone-100 p-7 md:p-10 flex flex-col md:flex-row md:items-center gap-6">
      <div className="flex-1">
        <div className="upper opacity-70 mb-2">Go live</div>
        <h2 className="text-3xl md:text-4xl">Reason with real Gemini AI</h2>
        <p className="text-sm text-stone-300 mt-3 max-w-xl">{ai === 'gemini' ? 'Gemini is connected. The crew is reasoning with real AI.' : 'Add your Gemini key on the server to switch from simulation to real AI reasoning.'}</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-4 text-sm max-w-md">{['Real AI reasoning', 'Human approvals', 'Full audit trail', 'Auto fallback'].map((x) => <div key={x} className="flex items-center gap-2 text-stone-200"><Check size={14} className="text-emerald-300" />{x}</div>)}</div>
      </div>
      <button className="btn btn-gold" onClick={() => launch(PRESETS[0].text)}>Try it now <ArrowRight size={15} /></button>
    </section>
  )

  const recent = () => runs.length > 0 && (
    <section>
      <div className="flex items-center justify-between mb-3"><h2 className="text-2xl">Recent runs</h2><Link to="/history" className="upper text-stone-600 hover:text-stone-900">See all →</Link></div>
      <div className="grid md:grid-cols-2 gap-3">
        {runs.slice(0, 4).map((r) => (
          <Link key={r.id} to={`/runs/${r.id}`} className="glass p-4 hover:bg-white transition">
            <div className="text-sm text-stone-800 line-clamp-1">{r.incident}</div>
            <div className="text-xs text-stone-500 mt-1">#{r.id} · {r.status.replace('_', ' ')}{r.summary?.headline ? ' · ' + r.summary.headline : ''}</div>
          </Link>
        ))}
      </div>
    </section>
  )

  const scenarioCards = (cols) => (
    <div className={`grid ${cols} gap-5`}>
      {PRESETS.map((p) => (
        <button key={p.title} disabled={busy} onClick={() => launch(p.text)} className="glass sc-card p-6 text-left disabled:opacity-50 group">
          <div className="flex items-center justify-between"><p.icon size={26} strokeWidth={1.3} /><span className="upper text-stone-500">{p.tag}</span></div>
          <h3 className="text-2xl mt-6 leading-tight">{p.title}</h3>
          <p className="text-sm text-stone-600 mt-3 leading-relaxed">{p.text}</p>
          <div className="mt-6 upper flex items-center gap-1 group-hover:gap-2 transition-all">Deploy the crew <ArrowUpRight size={14} /></div>
        </button>))}
    </div>
  )

  return (
    <div className="space-y-10 md:space-y-16">
      {/* ================= MOBILE ================= */}
      <div className="md:hidden space-y-8">
        <section className="hero sm fade-up">
          <div className="in">
            <div className="upper text-stone-600 mb-3">Welcome, {(user.name || 'Manager').split(' ')[0]}</div>
            <h1 className="text-[38px] leading-[1.05]">Calm operations,<br />meticulously<br />balanced.</h1>
            <button className="btn btn-primary mt-5 !py-2.5 bg-[#f3f0eb]" onClick={() => launch(PRESETS[0].text)}>Run the crew</button>
          </div>
        </section>

        <section className="panel-taupe py-8 px-8"><OrbitVisual /></section>

        <section className="grid grid-cols-4 gap-2.5">
          {[[Bot, 'Crew', () => scrollTo('crew')], [Database, 'Systems', () => nav('/systems')], [HistoryIcon, 'History', () => nav('/history')],
            [RotateCcw, 'Reset', async () => { await api.post('/reset'); load() }]].map(([I, l, f]) => (
            <button key={l} onClick={f} className="tile"><I size={22} strokeWidth={1.4} />{l}</button>))}
        </section>

        <Problem />
        <Sentinel signals={sg?.signals} onHandle={launch} busy={busy} />
        <NetworkMap data={sys} risks={sg?.suppliers} />

        <section id="launch">
          <h2 className="text-3xl mb-4">Launch a scenario</h2>
          <div className="mb-5"><Autonomy /></div>
          {scenarioCards('grid-cols-1')}
          <div className="mt-4 flex gap-2"><input id="custom-m" className="input" placeholder={mic ? 'Listening…' : 'Describe your own incident…'} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && text.length > 7 && launch(text)} />{MicBtn()}</div>
          {text.length > 7 && <button className="btn btn-primary w-full justify-center mt-3" disabled={busy} onClick={() => launch(text)}>Run the crew <ArrowRight size={15} /></button>}
          {err && <div className="mt-2 text-sm text-rose-700">{err}</div>}
        </section>
        {banner()}
        {recent()}
      </div>

      {/* ================= DESKTOP ================= */}
      <div className="hidden md:block space-y-0">
        <section className="hero fade-up">
          <div className="grid grid-cols-[1.05fr_.95fr] items-center w-full px-14 py-12 gap-6 relative z-[2]">
            <div>
              <h1 className="text-6xl xl:text-7xl leading-[1.02]">The Golden<br />Balance.</h1>
              <p className="text-stone-700 mt-6 max-w-md text-[15px] leading-relaxed italic">Disruptions are inevitable. OpsPilot is an autonomous crew of AI agents that plans, sources, communicates and acts, so a supplier failure becomes a solved problem in seconds.</p>
              <div className="flex items-center gap-4 mt-8">
                <button className="btn btn-primary bg-[#f3f0eb]/70" onClick={() => scrollTo('launch')}>Launch the crew</button>
                <button onClick={() => launch(PRESETS[0].text)} className="upper flex items-center gap-2 text-stone-700 hover:text-stone-900"><Play size={14} className="fill-stone-800" />Watch demo</button>
              </div>
            </div>
            <OrbitVisual />
          </div>
        </section>

        <section id="crew" className="grid grid-cols-[1fr_1fr] min-h-[560px]">
          <div className="panel-taupe flex items-center justify-center px-14 py-10">
            <div className="w-full space-y-0 divide-y divide-stone-900/20">
              {[['7', 'AI agents in one crew'], ['~1-2 min', 'Average time to resolve'], ['100%', 'Risky moves human-approved']].map(([n, l]) => (
                <div key={l} className="py-7 flex items-baseline gap-6"><span className="serif text-7xl leading-none text-stone-800 w-44">{n}</span><span className="upper text-stone-700">{l}</span></div>))}
            </div>
          </div>
          <div className="bg-[#f3f0eb] flex flex-col justify-center px-16 py-14">
            <div className="upper text-stone-500 mb-4">Seven agents · one crew</div>
            <h2 className="text-5xl leading-[1.05]">Agents, meticulously<br />balanced.</h2>
            <p className="text-stone-600 mt-6 max-w-md leading-relaxed text-[15px]">At OpsPilot we believe operations should feel calm. Seven specialised agents hand work to one another like a real team, while a rule-based Guardian keeps every risky decision in human hands.</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-5 mt-8 max-w-lg">
              {FEATURES.map((f) => (
                <div key={f.t} className="flex gap-3"><f.icon size={20} strokeWidth={1.3} className="mt-1 shrink-0 text-stone-700" /><div><div className="text-sm font-semibold">{f.t}</div><div className="text-xs text-stone-500 mt-0.5 leading-relaxed">{f.d}</div></div></div>))}
            </div>
            <div><button className="btn btn-primary mt-9" onClick={() => scrollTo('launch')}>Explore scenarios</button></div>
          </div>
        </section>

        <section className="grid grid-cols-[1fr_1fr] bg-[#d9d3c7]">
          <div className="p-12 flex flex-col justify-center"><div className="upper text-stone-600 mb-3">Your business right now</div><h2 className="text-4xl leading-tight">Everything the crew can see and act on.</h2></div>
          <div className="p-12 pl-4 flex items-center">
            <div className="grid grid-cols-2 gap-4 w-full">
              {kpis.map(([I, l, v]) => (
                <div key={l} className="bg-[#f3f0eb] p-5 border border-stone-900/10"><I size={20} strokeWidth={1.3} className="text-stone-600" /><div className="text-4xl serif mt-3">{v}</div><div className="upper text-stone-500 mt-1 !text-[10px]">{l}</div></div>))}
            </div>
          </div>
        </section>

        <section className="bg-[#f3f0eb] flex items-center px-8 py-8 overflow-x-auto">
          {ORDER.map((k, i) => { const A = AGENTS[k]; const I = A.icon; return (
            <div key={k} className="flex items-center flex-1 min-w-fit">
              <div className="node flex flex-col items-center gap-2 min-w-[80px]">
                <div className="node-i" style={{ '--c': A.color, color: A.color }}><I size={22} strokeWidth={1.4} /></div>
                <div className="text-xs font-semibold">{A.name}</div><div className="text-[10px] text-stone-500 -mt-1.5">{A.role}</div>
              </div>
              {i < ORDER.length - 1 && <div className="link" />}
            </div>) })}
        </section>

        <div className="space-y-20 pt-20">
          <Problem />
          <Sentinel signals={sg?.signals} onHandle={launch} busy={busy} />
          <NetworkMap data={sys} risks={sg?.suppliers} />
          <section id="launch" className="scroll-mt-24">
            <div className="upper text-stone-500 mb-2">Choose an incident</div>
            <h2 className="text-5xl mb-8">Launch a scenario</h2>
            <div className="mb-6 max-w-4xl"><Autonomy /></div>
            {scenarioCards('grid-cols-3')}
          </section>
          {customBox()}
          {banner()}
          {recent()}
        </div>
      </div>
    </div>
  )
}
