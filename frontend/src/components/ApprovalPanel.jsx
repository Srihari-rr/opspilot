import { useState } from 'react'
import { ShieldAlert, Check, X, ChevronDown, Send } from 'lucide-react'
import { api, errMsg, inr } from '../api'

const line = (a) => a.type === 'PURCHASE_ORDER'
  ? `${a.payload.qty} × ${a.payload.product} from ${a.payload.supplier} · ${inr(a.payload.total)} · ETA ${a.payload.eta_days}d`
  : `Email to ${a.payload.to}: "${a.payload.subject}"`

export default function ApprovalPanel({ runId, actions, onDone }) {
  const pend = actions.filter((a) => a.status === 'pending_approval')
  const [dec, setDec] = useState(() => Object.fromEntries(pend.map((a) => [a.id, 'approve'])))
  const [open, setOpen] = useState({})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function submit(all) {
    setBusy(true); setErr('')
    const decisions = all ? Object.fromEntries(pend.map((a) => [a.id, 'approve'])) : dec
    try { await api.post(`/runs/${runId}/decision`, { decisions }); onDone?.() } catch (e) { setErr(errMsg(e)); setBusy(false) }
  }
  if (!pend.length) return null

  return (
    <div className="fade-up rounded-sm border border-amber-400/40 bg-amber-400/[.07] p-5 mb-24 md:mb-0 shadow-[0_0_60px_-15px_rgba(251,191,36,.45)]">
      <div className="flex items-center gap-3 mb-1"><div className="w-10 h-10 rounded-sm bg-amber-400/20 grid place-items-center text-amber-800 pulse-ring" style={{ '--ring': 'rgba(251,191,36,.5)' }}><ShieldAlert size={20} /></div>
        <div><div className="font-bold text-lg">Your approval is needed</div><div className="text-sm text-stone-700">The Guardian flagged {pend.length} action(s). Review each one, then confirm.</div></div></div>
      <div className="flex flex-wrap gap-3 mt-4">
        <button className="btn btn-primary" disabled={busy} onClick={() => submit(true)}><Check size={15} />Approve all</button>
        <button className="btn btn-ghost" disabled={busy} onClick={() => submit(false)}><Send size={15} />Confirm my decisions</button>
      </div>
      <div className="mt-4 space-y-2">
        {pend.map((a) => (
          <div key={a.id} className="rounded-sm bg-stone-900/5 border border-stone-900/15 p-3">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[11px] uppercase tracking-wider text-amber-800">{a.type.replace('_', ' ')}</div>
                <div className="text-sm font-medium">{line(a)}</div>
                <div className="text-xs text-stone-600 mt-0.5">{a.reason}</div>
                {a.type === 'CUSTOMER_EMAIL' && <button className="text-xs text-stone-600 mt-1 flex items-center gap-1" onClick={() => setOpen({ ...open, [a.id]: !open[a.id] })}>Preview email <ChevronDown size={12} className={open[a.id] ? 'rotate-180' : ''} /></button>}
              </div>
              <div className="flex rounded-sm overflow-hidden border border-stone-900/15 shrink-0">
                <button onClick={() => setDec({ ...dec, [a.id]: 'approve' })} className={`px-3 py-1.5 text-xs font-semibold flex items-center gap-1 ${dec[a.id] === 'approve' ? 'bg-[#5f8a6a] text-white' : 'bg-stone-900/5 text-stone-700'}`}><Check size={13} />Approve</button>
                <button onClick={() => setDec({ ...dec, [a.id]: 'reject' })} className={`px-3 py-1.5 text-xs font-semibold flex items-center gap-1 ${dec[a.id] === 'reject' ? 'bg-[#a8453f] text-white' : 'bg-stone-900/5 text-stone-700'}`}><X size={13} />Reject</button>
              </div>
            </div>
            {open[a.id] && <pre className="mt-3 text-xs whitespace-pre-wrap font-sans text-stone-700 bg-stone-900/5 rounded-sm p-3 border border-stone-900/15">{a.payload.body}</pre>}
          </div>
        ))}
      </div>
            <div className="flex flex-wrap gap-3 mt-4">
        <button className="btn btn-primary" disabled={busy} onClick={() => submit(false)}><Send size={15} />Confirm my decisions</button>
        <button className="btn btn-ghost" disabled={busy} onClick={() => submit(true)}>Approve all</button>
      </div>
      {err && <div className="text-rose-700 text-sm mt-2">{err}</div>}
    </div>
  )
}
