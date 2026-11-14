import { ArrowUpRight, Radar, Brain, ShieldCheck, LineChart, Workflow } from 'lucide-react'

const STATS = [
  { n: '96%', t: 'of organisations were hit by moderate or significant supply-chain disruption in 2025, losing about $4 million on average.', s: 'Xeneta 2026 Freight Report', u: 'https://www.xeneta.com/blog/who-pays-when-supply-chains-break-what-the-2026-freight-report-reveals' },
  { n: '8.7h + 40h', t: 'to detect a disruption, then to understand its impact. Only 12% can see beyond Tier-2 suppliers.', s: 'Sphera, May 2026 (200 COOs and CFOs)', u: 'https://natlawreview.com/press-releases/nearly-half-companies-lose-4-revenue-due-supply-chain-disruption' },
  { n: '40%+', t: 'of agentic AI projects will be cancelled by 2027: rising cost, unclear value and weak risk controls.', s: 'Gartner forecast, June 2025', u: 'https://lusivision.com/en/blog/agentic-ai-projects-canceled-2027-gartner' },
  { n: '85%', t: 'of companies lack the orchestration to connect AI agents, people and systems. Staff lose 28% of their time switching tools.', s: 'Talkdesk, Aug 2026', u: 'https://www.talkdesk.com/news-and-press/press-releases/state-of-agentic-automation-cx-2026/' },
]
const ANSWERS = [
  [Radar, 'Detection gap', 'The Sentinel agent scans for threats around the clock and scores them against your real orders in seconds, not hours.'],
  [Brain, 'Impact gap', 'The Analyst simulates exactly which orders will break and by how much. The whole crew resolves an incident in about a minute.'],
  [LineChart, 'Value and cost', 'Every run is measured: revenue protected, hours replaced, and the AI cost per resolved incident. No guessing the ROI.'],
  [ShieldCheck, 'Trust and control', 'The Guardian policy engine plus the autonomy dial replace "all or nothing" with proportional control. Every action is auditable.'],
  [Workflow, 'Orchestration', 'Seven specialised agents hand work to each other and act across orders, inventory, purchasing, email and tickets, with one human checkpoint.'],
]

export default function Problem() {
  return (
    <section id="problem" className="scroll-mt-24">
      <div className="upper text-stone-500 mb-2">Why this matters · real 2025 / 2026 data</div>
      <h2 className="text-4xl md:text-5xl leading-tight max-w-3xl">The problem is real, and <span className="grad-text">it is getting worse</span></h2>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-8">
        {STATS.map((x) => (
          <a key={x.n} href={x.u} target="_blank" rel="noreferrer" className="glass p-5 flex flex-col hover:bg-white transition group">
            <div className="serif text-5xl leading-none">{x.n}</div>
            <p className="text-sm text-stone-700 mt-4 leading-relaxed flex-1">{x.t}</p>
            <div className="upper !text-[10px] text-stone-500 mt-4 flex items-center gap-1 group-hover:text-stone-900">{x.s}<ArrowUpRight size={12} /></div>
          </a>))}
      </div>
      <div className="bg-[#4a4844] text-stone-100 mt-6 p-6 md:p-9">
        <div className="upper opacity-70 mb-2">How OpsPilot answers it</div>
        <h3 className="text-3xl md:text-4xl mb-6">One crew. Five gaps closed.</h3>
        <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-6">
          {ANSWERS.map(([I, t, d]) => (
            <div key={t}><I size={22} strokeWidth={1.3} className="text-stone-300" /><div className="serif text-2xl mt-3">{t}</div><p className="text-xs text-stone-300 mt-2 leading-relaxed">{d}</p></div>))}
        </div>
      </div>
    </section>
  )
}
