import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, inr } from '../api'

export default function HistoryPage() {
  const [runs, setRuns] = useState(null)
  useEffect(() => { api.get('/runs').then((r) => setRuns(r.data)) }, [])
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Run <span className="grad-text">History</span></h1>
      {!runs ? <div className="text-stone-600">Loading...</div> : runs.length === 0 ? <div className="glass p-10 text-center text-stone-600">No runs yet. Launch a scenario from the Command Center.</div> : (
        <div className="space-y-3">{runs.map((r) => (
          <Link key={r.id} to={`/runs/${r.id}`} className="glass p-5 flex flex-wrap gap-4 items-center justify-between hover:bg-stone-900/5 transition">
            <div className="min-w-0 flex-1"><div className="font-medium">{r.incident}</div><div className="text-xs text-stone-500 mt-1">Run #{r.id} · {new Date(r.created_at + 'Z').toLocaleString()}</div></div>
            {r.summary?.metrics && <div className="text-sm text-emerald-700">{r.summary.metrics.orders_protected} orders saved · {inr(r.summary.metrics.revenue_protected)}</div>}
            <span className="text-xs px-2.5 py-1 rounded-full bg-stone-900/5 text-stone-700">{r.status.replace('_', ' ')}</span>
          </Link>))}</div>)}
    </div>
  )
}
