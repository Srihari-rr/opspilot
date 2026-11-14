import { useEffect, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { api, inr } from '../api'

const TABS = ['orders', 'products', 'purchase_orders', 'outbox', 'tickets']
const LABEL = { orders: 'Orders (CRM)', products: 'Inventory (ERP)', purchase_orders: 'Purchase Orders', outbox: 'Email Outbox', tickets: 'Escalation Tickets' }

const statusColor = (s) => /secured/i.test(s) ? 'bg-emerald-500/20 text-emerald-700' : /delayed|risk/i.test(s) ? 'bg-rose-500/20 text-rose-700' : 'bg-stone-900/5 text-stone-700'

export default function Systems() {
  const [d, setD] = useState(null)
  const [tab, setTab] = useState('orders')
  const load = () => api.get('/systems').then((r) => setD(r.data))
  useEffect(() => { load() }, [])
  if (!d) return <div className="text-stone-600">Loading...</div>

  const Table = ({ cols, rows, empty }) => rows.length ? (
    <div className="overflow-x-auto"><table className="text-sm">
      <thead><tr className="text-left text-xs uppercase tracking-wider text-stone-500">{cols.map((c) => <th key={c[0]} className="py-3 px-3 font-medium">{c[0]}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-stone-900/15 hover:bg-stone-900/5">{cols.map((c) => <td key={c[0]} className="py-3 px-3 align-top">{c[1](r)}</td>)}</tr>)}</tbody>
    </table></div>) : <div className="text-stone-500 py-10 text-center">{empty}</div>

  const views = {
    orders: <Table rows={d.orders} empty="No orders" cols={[['Order', (r) => <b>{r.id}</b>], ['Customer', (r) => r.customer], ['Tier', (r) => <span className={r.tier === 'enterprise' ? 'text-stone-600' : 'text-stone-600'}>{r.tier}</span>], ['Product', (r) => r.product_name], ['Qty', (r) => r.qty], ['Value', (r) => inr(r.value)], ['Due', (r) => r.due_date], ['Status', (r) => <span className={`text-xs px-2 py-1 rounded-md ${statusColor(r.status)}`}>{r.status}</span>]]} />,
    products: <Table rows={d.products} empty="" cols={[['SKU', (r) => <b>{r.id}</b>], ['Product', (r) => r.name], ['Primary supplier', (r) => r.supplier_name], ['Stock', (r) => r.stock], ['Sell price', (r) => inr(r.sell_price)]]} />,
    purchase_orders: <Table rows={d.purchase_orders} empty="No purchase orders yet. Run the crew to see them appear." cols={[['PO', (r) => <b>#{r.id}</b>], ['Supplier', (r) => r.supplier_name], ['Product', (r) => r.product_name], ['Qty', (r) => r.qty], ['Total', (r) => inr(r.total)], ['ETA', (r) => r.eta_days + ' days']]} />,
    outbox: <Table rows={d.outbox} empty="No emails sent yet." cols={[['To', (r) => <b>{r.to_name}</b>], ['Order', (r) => r.order_id], ['Subject', (r) => r.subject], ['Message', (r) => <div className="max-w-md whitespace-pre-wrap text-stone-600 text-xs">{r.body}</div>]]} />,
    tickets: <Table rows={d.tickets} empty="No tickets yet." cols={[['Ticket', (r) => <b>#{r.id}</b>], ['Title', (r) => r.title], ['Severity', (r) => <span className="text-rose-700">{r.severity}</span>], ['Details', (r) => <span className="text-stone-600">{r.detail}</span>]]} />,
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-3xl font-extrabold tracking-tight">Business <span className="grad-text">Systems</span></h1>
          <p className="text-stone-600 mt-1">The live data the agents read from and write to. Run a scenario, then come back to see the changes.</p></div>
        <button className="btn btn-ghost" onClick={async () => { await api.post('/reset'); load() }}><RotateCcw size={15} />Reset demo data</button>
      </div>
      <div className="flex flex-wrap gap-2">{TABS.map((t) => (
        <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-sm text-sm font-medium transition ${tab === t ? 'bg-stone-800 text-white' : 'glass text-stone-700 hover:bg-stone-900/5'}`}>
          {LABEL[t]}{['purchase_orders', 'outbox', 'tickets'].includes(t) && d[t].length > 0 && <span className="ml-2 text-xs bg-stone-900/5 rounded-full px-1.5">{d[t].length}</span>}</button>))}</div>
      <div className="glass p-2">{views[tab]}</div>
    </div>
  )
}
