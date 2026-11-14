// In-browser copy of the backend agent crew, used by the single-file demo (no server needed).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN')
import { buildSignals, analytics, answerQuestion } from '../../../backend/src/shared/insights.js'
export const POLICY = { poLimit: 50000, minReliability: 0.9, maxPremium: 0.15 }
const isoIn = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10)

let DB, runs = [], evId = 0, actId = 0, runSeq = 0
const listeners = {}, gates = {}

export function seed() {
  const suppliers = [['SUP-01', 'Apex Components', 'Shenzhen'], ['SUP-02', 'Nova Plastics', 'Pune'], ['SUP-03', 'Voltix Energy', 'Chennai'], ['SUP-04', 'Zenith Micro', 'Bengaluru'],
    ['SUP-05', 'Orbit Industrial', 'Taipei'], ['SUP-06', 'PolyForm India', 'Ahmedabad'], ['SUP-07', 'CellCore', 'Hyderabad']].map(([id, name, city]) => ({ id, name, city }))
  const products = [['P-100', 'Smart Sensor Module', 750, 'SUP-01', 70], ['P-101', 'Control Board v2', 1650, 'SUP-01', 15], ['P-200', 'Casing Kit', 260, 'SUP-02', 60],
    ['P-201', 'Cable Harness', 150, 'SUP-02', 100], ['P-300', 'Battery Pack 5Ah', 1100, 'SUP-03', 40]].map(([id, name, sell_price, primary_supplier, stock]) => ({ id, name, sell_price, primary_supplier, stock }))
  const sp = [['SUP-01', 'P-100', 420, 7, .96], ['SUP-04', 'P-100', 465, 4, .91], ['SUP-05', 'P-100', 395, 12, .88], ['SUP-01', 'P-101', 980, 8, .96], ['SUP-04', 'P-101', 1060, 5, .93],
    ['SUP-05', 'P-101', 940, 14, .86], ['SUP-02', 'P-200', 150, 5, .94], ['SUP-06', 'P-200', 162, 3, .92], ['SUP-02', 'P-201', 90, 4, .95], ['SUP-06', 'P-201', 98, 3, .9],
    ['SUP-03', 'P-300', 650, 6, .95], ['SUP-07', 'P-300', 690, 4, .93]].map(([supplier_id, product_id, unit_cost, lead_days, reliability]) => ({ supplier_id, product_id, unit_cost, lead_days, reliability }))
  const price = Object.fromEntries(products.map((p) => [p.id, p.sell_price]))
  const orders = [['O-1001', 'Zephyr Retail', 'standard', 'P-100', 40, 3], ['O-1002', 'Metro Mart', 'enterprise', 'P-100', 50, 5], ['O-1003', 'Kiran Electronics', 'standard', 'P-100', 30, 8],
    ['O-1004', 'Helix Smart Homes', 'enterprise', 'P-100', 60, 12], ['O-1005', 'Orbital Labs', 'standard', 'P-100', 25, 20], ['O-1006', 'Metro Mart', 'enterprise', 'P-101', 20, 2],
    ['O-1007', 'Kiran Electronics', 'standard', 'P-101', 25, 6], ['O-1008', 'Helix Smart Homes', 'enterprise', 'P-101', 30, 10], ['O-1009', 'Greenleaf Stores', 'standard', 'P-200', 30, 4],
    ['O-1010', 'Metro Mart', 'enterprise', 'P-200', 40, 7], ['O-1011', 'Zephyr Retail', 'standard', 'P-200', 30, 15], ['O-1012', 'Kiran Electronics', 'standard', 'P-201', 60, 6],
    ['O-1013', 'Helix Smart Homes', 'enterprise', 'P-201', 80, 9], ['O-1014', 'Orbital Labs', 'enterprise', 'P-300', 30, 3], ['O-1015', 'Greenleaf Stores', 'standard', 'P-300', 35, 7],
    ['O-1016', 'Zephyr Retail', 'standard', 'P-300', 20, 10]].map(([id, customer, tier, product_id, qty, due]) => ({ id, customer, tier, product_id, qty, value: qty * price[product_id], due_in: due, due_date: isoIn(due), status: 'open', note: '' }))
  DB = { suppliers, products, sp, orders, purchase_orders: [], outbox: [], tickets: [] }
}
seed()

const prod = (id) => DB.products.find((p) => p.id === id)
const sup = (id) => DB.suppliers.find((s) => s.id === id)
const primary = (pid) => DB.sp.find((x) => x.product_id === pid && x.supplier_id === prod(pid).primary_supplier)
const alts = (pid, ex) => DB.sp.filter((x) => x.product_id === pid && x.supplier_id !== ex).map((x) => ({ ...x, name: sup(x.supplier_id).name, city: sup(x.supplier_id).city })).sort((a, b) => a.lead_days - b.lead_days)
function exposure(sid, blocked) {
  return DB.products.filter((p) => p.primary_supplier === sid).map((p) => {
    let rem = blocked ? 0 : p.stock
    const orders = DB.orders.filter((o) => o.product_id === p.id && o.status === 'open').map((o) => ({ ...o, due_in_days: o.due_in })).sort((a, b) => a.due_in_days - b.due_in_days)
      .map((o) => { const al = Math.min(o.qty, rem); rem -= al; return { ...o, allocated: al, shortage: o.qty - al } })
    const short = orders.filter((o) => o.shortage > 0)
    return { product: p, effectiveStock: blocked ? 0 : p.stock, orders, totalShortage: short.reduce((s, o) => s + o.shortage, 0), earliestShortDue: short.length ? Math.min(...short.map((o) => o.due_in_days)) : null }
  })
}

function emit(run, agent, type, title, data = {}) {
  const e = { id: ++evId, run_id: run.id, agent, type, title, data, ts: new Date().toISOString() }
  run.events.push(e); (listeners[run.id] || []).forEach((f) => f(e))
}

/* ---------- public API used by the mock axios adapter ---------- */
export const api = {
  systems: () => ({
    suppliers: DB.suppliers, products: DB.products.map((p) => ({ ...p, supplier_name: sup(p.primary_supplier).name })),
    orders: [...DB.orders].sort((a, b) => a.due_in - b.due_in).map((o) => ({ ...o, product_name: prod(o.product_id).name })),
    purchase_orders: DB.purchase_orders, outbox: DB.outbox, tickets: DB.tickets, supplier_products: DB.sp,
  }),
  signals: () => buildSignals(api.systems()),
  insights: () => {
    const g = { auto: 0, human_approved: 0, rejected: 0, pending: 0 }
    runs.forEach((r) => r.actions.forEach((x) => { if (!x.needs_approval) g.auto++; else if (x.status === 'rejected') g.rejected++; else if (x.status === 'pending_approval') g.pending++; else g.human_approved++ }))
    return { ...analytics(api.runsList()), governance: g }
  },
  ask: (question) => ({ answer: answerQuestion(question, api.systems(), api.runsList()), source: 'rules' }),
  reset: () => { seed(); return { ok: true } },
  runsList: () => [...runs].reverse().map(({ id, incident, status, summary, created_at }) => ({ id, incident, status, summary, created_at })),
  run: (id) => { const r = runs.find((x) => x.id === Number(id)); return r ? { ...r } : null },
  createRun: (incident, autonomy = 'balanced') => {
    const run = { id: ++runSeq, incident, status: 'running', summary: null, created_at: new Date().toISOString().slice(0, 19).replace('T', ' '), events: [], actions: [], autonomy }
    runs.push(run); setTimeout(() => pipeline(run), 200); return { id: run.id }
  },
  decide: (id, decisions) => { const g = gates[id]; if (!g) return { ok: false }; g(decisions); return { ok: true } },
  subscribe: (id, cb) => {
    const run = runs.find((x) => x.id === Number(id)); if (!run) return { close() {} }
    run.events.forEach(cb); (listeners[run.id] ||= []).push(cb)
    return { close: () => { listeners[run.id] = (listeners[run.id] || []).filter((f) => f !== cb) } }
  },
}

async function pipeline(run) {
  const t0 = Date.now(), incident = run.incident
  const poLimit = { cautious: 0, balanced: POLICY.poLimit, autonomous: POLICY.poLimit * 2 }[run.autonomy] ?? POLICY.poLimit
  try {
    emit(run, 'system', 'status', 'Incident received', { incident, ai: 'demo' }); await sleep(500)

    /* PLANNER */
    emit(run, 'planner', 'thought', 'Reading the incident and deciding what to do...'); await sleep(900)
    const low = incident.toLowerCase()
    const s = DB.suppliers.find((x) => low.includes(x.name.toLowerCase()) || low.includes(x.id.toLowerCase()) || low.includes(x.name.split(' ')[0].toLowerCase())) || DB.suppliers[0]
    const type = /recall|defect|quality|contaminat|fail/.test(low) ? 'recall' : /capacity|shortage|fire|half/.test(low) ? 'capacity' : 'delay'
    const m = low.match(/(\d+)\s*-?\s*day/); const D = m ? +m[1] : type === 'recall' ? 14 : type === 'capacity' ? 5 : 9
    const planned = { supplier_id: s.id, supplier_name: s.name, disruption_type: type, delay_days: D, severity: D >= 12 ? 'critical' : D >= 7 ? 'high' : 'medium', summary: `${s.name} disruption (${type}) expected to last about ${D} days.` }
    emit(run, 'planner', 'result', 'Incident understood', { ...planned, source: 'rules' }); await sleep(600)
    emit(run, 'planner', 'plan', 'Execution plan created', { steps: ['Find every open order that depends on the affected supplier', 'Check stock and work out which orders will be late', 'Choose the best alternate supplier for each shortage', 'Draft personalised messages for impacted customers', 'Check every action against company policy, ask a human only when needed', 'Execute approved actions across all systems'] }); await sleep(800)

    /* ANALYST */
    const blocked = type === 'recall'
    emit(run, 'analyst', 'tool', 'get_open_orders(supplier)', { supplier: s.name }); const exp = exposure(s.id, blocked); await sleep(550)
    emit(run, 'analyst', 'tool', 'check_inventory(products)', { products: exp.map((e) => ({ product: e.product.name, stock: e.product.stock, usable: e.effectiveStock })) }); await sleep(550)
    emit(run, 'analyst', 'tool', 'simulate_disruption(delay_days)', { delay_days: D, blocked_stock: blocked }); await sleep(600)
    const all = exp.flatMap((e) => e.orders), shortO = all.filter((o) => o.shortage > 0)
    const primEta = (pid) => D + (primary(pid)?.lead_days || 0)
    const baseLate = shortO.filter((o) => o.due_in_days < primEta(o.product_id))
    const exposed = shortO.reduce((a, o) => a + (o.value * o.shortage) / o.qty, 0)
    emit(run, 'analyst', 'result', `${shortO.length} of ${all.length} open orders are short on stock; ${baseLate.length} would be late if we do nothing (${inr(exposed)} exposed).`, {
      openOrdersAffected: all.length, ordersShort: shortO.length, ordersLateIfNoAction: baseLate.length, revenueExposed: Math.round(exposed),
      insights: exp.filter((e) => e.totalShortage > 0).map((e) => `${e.product.name}: short by ${e.totalShortage} units, earliest deadline in ${e.earliestShortDue} day(s).`).slice(0, 3) })
    await sleep(800)
    if (!shortO.length) { emit(run, 'reporter', 'summary', 'No action needed', { headline: 'No action needed', narrative: 'Current stock covers all open orders.', metrics: {} }); run.status = 'completed'; run.summary = { headline: 'No action needed' }; return }

    /* SOURCING */
    const needs = exp.filter((e) => e.totalShortage > 0).map((e) => ({ product_id: e.product.id, product: e.product.name, shortage: e.totalShortage, qty: Math.ceil(e.totalShortage * 1.1), dl: e.earliestShortDue, base: primary(e.product.id).unit_cost, c: alts(e.product.id, s.id) }))
    for (const n of needs) { emit(run, 'sourcing', 'tool', `find_alternate_suppliers(${n.product_id})`, { product: n.product, candidates: n.c }); await sleep(550) }
    emit(run, 'sourcing', 'thought', 'Weighing price, speed and reliability of each supplier...'); await sleep(1000)
    const plans = needs.map((n) => {
      const ok = n.c.filter((c) => c.lead_days <= n.dl), pool = ok.length ? ok : [n.c[0]]
      const b = [...pool].sort((a, z) => a.unit_cost / a.reliability - z.unit_cost / z.reliability)[0]
      return { product_id: n.product_id, product: n.product, supplier_id: b.supplier_id, supplier: b.name, qty: n.qty, unit_cost: b.unit_cost, total: n.qty * b.unit_cost, eta_days: b.lead_days, reliability: b.reliability, premium: (b.unit_cost - n.base) / n.base,
        reasoning: ok.length ? `${b.name} can deliver in ${b.lead_days} day(s), before the ${n.dl}-day deadline, at the best price/reliability balance.` : `No supplier can meet the ${n.dl}-day deadline; ${b.name} is the fastest at ${b.lead_days} days.` }
    })
    emit(run, 'sourcing', 'result', `Selected ${plans.length} alternate supplier(s)`, { purchase_orders: plans, source: 'rules' }); await sleep(800)
    const etaFor = (pid) => plans.find((p) => p.product_id === pid)?.eta_days ?? Infinity
    const outs = shortO.map((o) => { const eta = etaFor(o.product_id); return { ...o, eta, late: o.due_in_days < eta, days_late: Math.max(0, eta - o.due_in_days) } })
    const lateNow = outs.filter((o) => o.late), targets = [...lateNow, ...outs.filter((o) => !o.late && o.tier === 'enterprise')]

    /* COMMS */
    emit(run, 'comms', 'thought', `Drafting ${targets.length} personalised customer message(s)...`); await sleep(1100)
    const mails = targets.map((o) => o.late ? { o, subject: `Update on your order ${o.id}: a short delay`,
      body: `Hi ${o.customer} team,\n\nA disruption at one of our suppliers means order ${o.id} may reach you about ${o.days_late} day(s) later than promised. We have already secured replacement stock and will ship ${o.allocated > 0 ? `the ${o.allocated} units we have right now immediately, and the rest ` : 'it '}as soon as it arrives.\n\nWe are sorry for the inconvenience. ${o.tier === 'enterprise' ? 'Your account manager will call you today.' : 'Reply to this email if you need anything.'}\n\nTeam OpsPilot` }
      : { o, subject: `Good news: your order ${o.id} is protected`, body: `Hi ${o.customer} team,\n\nA supplier issue came up, but we acted early and secured alternate stock. Order ${o.id} is still on track to arrive by its due date.\n\nNo action needed from you.\n\nTeam OpsPilot` })
    emit(run, 'comms', 'result', `${mails.length} message(s) drafted`, { count: mails.length, source: 'rules' }); await sleep(700)

    /* GUARDIAN */
    emit(run, 'guardian', 'thought', `Checking every proposed action against company policy (autonomy: ${run.autonomy})...`, { policy: { ...POLICY, poLimit }, autonomy: run.autonomy }); await sleep(1000)
    const actions = run.actions
    const add = (type, payload, needs, risk, reason) => { const a = { id: ++actId, run_id: run.id, type, payload, risk, needs_approval: needs, reason, status: needs ? 'pending_approval' : 'auto_approved' }; actions.push(a); return a }
    const poA = {}
    plans.forEach((p) => {
      const why = []
      if (p.total > poLimit) why.push(poLimit === 0 ? 'cautious mode: every purchase order needs a human' : `order value ${inr(p.total)} is above the ${inr(poLimit)} auto-approval limit`)
      if (p.reliability < POLICY.minReliability) why.push(`supplier reliability ${(p.reliability * 100).toFixed(0)}% is below ${POLICY.minReliability * 100}%`)
      if (p.premium > POLICY.maxPremium) why.push(`price is ${(p.premium * 100).toFixed(0)}% above the usual supplier`)
      poA[p.product_id] = add('PURCHASE_ORDER', p, why.length > 0, why.length ? 'high' : 'low', why.length ? 'Needs human approval: ' + why.join('; ') : 'Within policy - auto-approved')
    })
    outs.forEach((o) => add('ORDER_UPDATE', { order_id: o.id, customer: o.customer, status: o.late ? `Delayed ${o.days_late}d - customer notified` : 'Secured - resupply arriving in time', note: o.late ? `Late by ${o.days_late} day(s)` : 'Alternate stock ordered', depends_on_action: poA[o.product_id].id }, false, 'low', 'Routine status update - auto-approved'))
    mails.forEach((mm) => { const ent = mm.o.tier === 'enterprise'; add('CUSTOMER_EMAIL', { order_id: mm.o.id, to: mm.o.customer, tier: mm.o.tier, late: mm.o.late, subject: mm.subject, body: mm.body }, ent, ent ? 'medium' : 'low', ent ? 'Needs human review: enterprise customer communication' : 'Standard customer message - auto-approved') })
    const le = lateNow.filter((o) => o.tier === 'enterprise')
    if (le.length) add('ESCALATION_TICKET', { title: `Call ${[...new Set(le.map((o) => o.customer))].join(', ')} about delayed orders`, severity: 'high', detail: le.map((o) => `${o.id} (${o.customer}) late by ${o.days_late}d`).join('; ') }, false, 'low', 'Escalation to account managers - auto-approved')
    const need = actions.filter((a) => a.needs_approval)
    emit(run, 'guardian', 'result', `${actions.length} actions checked: ${actions.length - need.length} auto-approved, ${need.length} need a human`, { actions: actions.map((a) => ({ ...a })), auto: actions.length - need.length, flagged: need.length }); await sleep(600)

    /* HUMAN GATE */
    let dec = {}
    if (need.length) {
      run.status = 'awaiting_approval'
      emit(run, 'guardian', 'approval', 'Waiting for human approval', { action_ids: need.map((a) => a.id) })
      dec = await new Promise((resolve) => { gates[run.id] = resolve }); delete gates[run.id]; run.status = 'running'
      const ap = need.filter((a) => dec[a.id] !== 'reject').length
      emit(run, 'guardian', 'result', `Human decision received: ${ap} approved, ${need.length - ap} rejected`, { decisions: dec }); await sleep(500)
    }
    actions.forEach((a) => { a.status = a.needs_approval ? (dec[a.id] === 'reject' ? 'rejected' : 'approved') : 'approved' })

    /* EXECUTOR */
    emit(run, 'executor', 'thought', 'Executing approved actions across Procurement, Orders, Email and Ticketing systems...'); await sleep(600)
    const poOk = (id) => actions.find((a) => a.id === id)?.status === 'approved'
    const c = { po: 0, mail: 0, upd: 0, ticket: 0, skipped: 0 }
    for (const a of actions) {
      await sleep(340); const p = a.payload
      if (a.status === 'rejected') { c.skipped++; emit(run, 'executor', 'action', `Skipped (rejected): ${a.type}`, { type: a.type, status: 'skipped' }); continue }
      if (a.type === 'PURCHASE_ORDER') { DB.purchase_orders.unshift({ id: DB.purchase_orders.length + 1, run_id: run.id, supplier_id: p.supplier_id, supplier_name: p.supplier, product_name: p.product, qty: p.qty, total: p.total, eta_days: p.eta_days }); c.po++; emit(run, 'executor', 'action', `Purchase order placed: ${p.qty} x ${p.product} from ${p.supplier}`, { type: a.type, status: 'done' }) }
      else if (a.type === 'ORDER_UPDATE') { const ok = poOk(p.depends_on_action); const o = DB.orders.find((x) => x.id === p.order_id); o.status = ok ? p.status : 'At risk - resupply not approved'; o.note = ok ? p.note : 'Awaiting decision'; c.upd++; emit(run, 'executor', 'action', `Order ${p.order_id} (${p.customer}) -> ${o.status}`, { type: a.type, status: 'done' }) }
      else if (a.type === 'CUSTOMER_EMAIL') { DB.outbox.unshift({ id: DB.outbox.length + 1, order_id: p.order_id, to_name: p.to, subject: p.subject, body: p.body }); c.mail++; emit(run, 'executor', 'action', `Email sent to ${p.to} (order ${p.order_id})`, { type: a.type, status: 'done' }) }
      else { DB.tickets.unshift({ id: DB.tickets.length + 1, title: p.title, severity: p.severity, detail: p.detail }); c.ticket++; emit(run, 'executor', 'action', `Escalation ticket created: ${p.title}`, { type: a.type, status: 'done' }) }
    }

    /* REPORTER */
    await sleep(500)
    const apPO = plans.filter((p) => poOk(poA[p.product_id].id))
    const saved = outs.filter((o) => !o.late && poOk(poA[o.product_id].id)), prot = baseLate.filter((b) => saved.some((x) => x.id === b.id))
    const rev = prot.reduce((a, o) => a + (o.value * o.shortage) / o.qty, 0), mins = all.length * 6 + apPO.length * 25 + c.mail * 8 + 20
    const metrics = { orders_analyzed: all.length, orders_protected: prot.length, revenue_protected: Math.round(rev), still_late: lateNow.length, po_placed: c.po, po_value: Math.round(apPO.reduce((a, p) => a + p.total, 0)), emails_sent: c.mail, tickets: c.ticket, actions_total: actions.length, actions_skipped: c.skipped, manual_minutes_saved: mins, agent_seconds: Math.round((Date.now() - t0) / 1000) }
    const sum = { headline: `${metrics.orders_protected} order(s) saved from delay, ${inr(metrics.revenue_protected)} of revenue protected.`,
      narrative: `After the ${s.name} disruption, the crew analysed ${metrics.orders_analyzed} open orders, placed ${metrics.po_placed} purchase order(s) worth ${inr(metrics.po_value)}, and sent ${metrics.emails_sent} customer message(s). ${metrics.still_late} order(s) remain late despite the best possible resupply and have been escalated. This would have taken roughly ${(mins / 60).toFixed(1)} hours manually.`,
      next_steps: ['Confirm delivery dates with the new suppliers', 'Follow up with escalated enterprise customers', 'Review whether to add a backup supplier for this component'] }
    emit(run, 'reporter', 'summary', sum.headline, { ...sum, metrics })
    run.summary = { ...sum, metrics: { ...metrics, ai_calls: 0, ai_tokens: 0, ai_cost_inr: 0 }, autonomy: run.autonomy }; run.status = 'completed'
    emit(run, 'system', 'status', 'Run completed', { status: 'completed' })
  } catch (err) { console.error(err); emit(run, 'system', 'error', 'The run failed: ' + err.message, {}); run.status = 'failed' }
}
