// Pure functions (no Node-only APIs) shared by the Express backend AND the in-browser demo engine.
// Sentinel risk signals, supplier risk scoring, analytics and the rule-based Copilot brain.

export const inr = (n) => '₹' + Math.round(n || 0).toLocaleString('en-IN');
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const dayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
const dueIn = (o) => (typeof o.due_in === 'number' ? o.due_in : Math.round((Date.parse(o.due_date) - dayStart()) / 86400000));
const SEV_W = { high: 45, medium: 28, low: 12 };
const SEV_RANK = { high: 0, medium: 1, low: 2 };

// What the Sentinel agent "sees" in the outside world (simulated live feeds, mapped to the real supplier data).
const FEED = [
  { sid: 'SUP-01', kind: 'delay', title: 'Port congestion at Shenzhen Yantian', detail: 'Vessel queue is now about 9 days. Apex Components cargo is held at anchorage.', source: 'Maritime AIS feed', severity: 'high', confidence: 0.91, days: 9, mins: 4,
    incident: 'Port congestion: Apex Components (Shenzhen) shipments are delayed by 9 days.' },
  { sid: 'SUP-03', kind: 'capacity', title: 'Cyclone warning near Chennai', detail: 'Voltix Energy plant is expected to pause production for about 8 days.', source: 'Weather alert feed', severity: 'high', confidence: 0.84, days: 8, mins: 17,
    incident: 'Cyclone warning: Voltix Energy (Chennai) factory capacity is cut, shipments delayed by 8 days.' },
  { sid: 'SUP-01', kind: 'delay', tier: 3, title: 'Tier-3 alert: magnet plant shut down upstream', detail: 'A raw-material plant two tiers behind Apex Components stopped production. Most teams cannot see this far upstream.', source: 'Deep-tier supplier graph', severity: 'medium', confidence: 0.61, days: 12, mins: 130,
    incident: 'Tier-3 upstream failure: Apex Components (Shenzhen) shipments are delayed by 12 days.' },
  { sid: 'SUP-02', kind: 'recall', title: 'Quality flag on casing resin lot', detail: 'Nova Plastics batch failed a customer QC audit. Existing stock may be quarantined.', source: 'Quality monitor', severity: 'medium', confidence: 0.72, days: 10, mins: 42,
    incident: 'Quality alert: Nova Plastics casing batch failed QC, all existing stock is quarantined for 10 days.' },
  { sid: 'SUP-05', kind: 'delay', title: 'Typhoon approaching Taipei', detail: 'Air freight from Orbit Industrial is suspended. This is a backup supplier for two products.', source: 'Weather + logistics feed', severity: 'medium', confidence: 0.66, days: 5, mins: 95,
    incident: 'Typhoon alert: Orbit Industrial (Taipei) air freight is suspended, shipments delayed by 5 days.' },
  { sid: 'SUP-04', kind: 'delay', title: 'Power maintenance notice in Bengaluru', detail: 'Zenith Micro will run reduced shifts for about 3 days. This is a backup supplier.', source: 'Utility notices', severity: 'low', confidence: 0.58, days: 3, mins: 180,
    incident: 'Power maintenance: Zenith Micro (Bengaluru) runs reduced shifts, shipments delayed by 3 days.' },
];

function exposureFor(D, sid, kind, days) {
  const prods = D.products.filter((p) => p.primary_supplier === sid);
  let count = 0, value = 0; const orderIds = [];
  for (const p of prods) {
    let rem = kind === 'recall' ? 0 : p.stock;
    const os = D.orders.filter((o) => o.product_id === p.id && o.status === 'open').sort((a, b) => dueIn(a) - dueIn(b));
    for (const o of os) {
      const al = Math.min(o.qty, rem); rem -= al; const short = o.qty - al;
      if (short > 0 && dueIn(o) < days) { count++; value += (o.value * short) / o.qty; orderIds.push(o.id); }
    }
  }
  const backupFor = [...new Set((D.supplier_products || []).filter((x) => x.supplier_id === sid && D.products.find((p) => p.id === x.product_id && p.primary_supplier !== sid)).map((x) => x.product_id))];
  return { orders: count, value: Math.round(value), orderIds, backupFor, primaryProducts: prods.length };
}

export function buildSignals(D) {
  const signals = FEED.map((f, i) => {
    const s = D.suppliers.find((x) => x.id === f.sid) || { name: f.sid, city: '' };
    return { id: `SIG-${100 + i}`, ...f, supplier: s.name, city: s.city, exposure: exposureFor(D, f.sid, f.kind, f.days) };
  }).sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity] || a.mins - b.mins);

  const suppliers = D.suppliers.map((s) => {
    const rows = (D.supplier_products || []).filter((x) => x.supplier_id === s.id);
    const rel = rows.length ? rows.reduce((t, r) => t + r.reliability, 0) / rows.length : 0.9;
    const sig = signals.find((x) => x.sid === s.id);
    const openValue = D.orders.filter((o) => o.status === 'open' && D.products.find((p) => p.id === o.product_id && p.primary_supplier === s.id)).reduce((t, o) => t + o.value, 0);
    const risk = clamp(Math.round((1 - rel) * 300 + (sig ? SEV_W[sig.severity] : 0) + Math.min(15, openValue / 15000)), 4, 99);
    return { id: s.id, name: s.name, city: s.city, reliability: Math.round(rel * 100), openValue, risk, signal: sig ? sig.severity : null };
  }).sort((a, b) => b.risk - a.risk);
  return { signals, suppliers };
}

export function analytics(runs) {
  const done = runs.filter((r) => r.status === 'completed' && r.summary?.metrics).sort((a, b) => a.id - b.id);
  const t = { runs: done.length, revenue: 0, orders: 0, minutes: 0, po_value: 0, emails: 0, tickets: 0, still_late: 0, agent_seconds: 0, ai_calls: 0, ai_cost: 0 };
  const series = done.map((r) => {
    const m = r.summary.metrics;
    t.revenue += m.revenue_protected || 0; t.orders += m.orders_protected || 0; t.minutes += m.manual_minutes_saved || 0;
    t.po_value += m.po_value || 0; t.emails += m.emails_sent || 0; t.tickets += m.tickets || 0; t.still_late += m.still_late || 0; t.agent_seconds += m.agent_seconds || 0; t.ai_calls += m.ai_calls || 0; t.ai_cost += m.ai_cost_inr || 0;
    return { id: r.id, label: `#${r.id}`, incident: r.incident, revenue: m.revenue_protected || 0, orders: m.orders_protected || 0, minutes: m.manual_minutes_saved || 0, po: m.po_placed || 0 };
  });
  const crewSec = Math.max(20 * done.length, t.agent_seconds);
  t.speedup = done.length ? Math.max(1, Math.round((t.minutes * 60) / crewSec)) : 0;
  t.hours = Math.round((t.minutes / 60) * 10) / 10;
  t.manual_cost = Math.round((t.minutes / 60) * 500); // assumes Rs 500 / hour of ops staff time
  t.ai_cost = Math.round(t.ai_cost * 100) / 100;
  return { totals: t, series, awaiting: runs.filter((r) => r.status === 'awaiting_approval').length };
}

/* ---------------- Copilot brain (used offline, and as fallback if Gemini is down) ---------------- */
export function copilotContext(D, runs) {
  const { signals, suppliers } = buildSignals(D);
  const a = analytics(runs);
  return {
    open_orders: D.orders.filter((o) => o.status === 'open').length,
    open_order_value: Math.round(D.orders.reduce((s, o) => s + o.value, 0)),
    top_signals: signals.slice(0, 4).map((s) => ({ title: s.title, supplier: s.supplier, severity: s.severity, confidence: s.confidence, orders_at_risk: s.exposure.orders, value_at_risk: s.exposure.value })),
    suppliers: suppliers.map((s) => ({ name: s.name, city: s.city, reliability_pct: s.reliability, risk_score: s.risk })),
    low_stock: D.products.map((p) => ({ name: p.name, stock: p.stock, open_demand: D.orders.filter((o) => o.product_id === p.id).reduce((t, o) => t + o.qty, 0) })),
    crew_totals: a.totals,
    policy: { po_auto_limit: 50000, min_reliability_pct: 90, max_price_premium_pct: 15 },
  };
}

export function answerQuestion(q, D, runs) {
  const t = (q || '').toLowerCase();
  const { signals, suppliers } = buildSignals(D);
  const open = D.orders.filter((o) => o.status === 'open');
  const total = open.reduce((s, o) => s + o.value, 0);
  const A = analytics(runs).totals;
  const has = (...w) => w.some((x) => t.includes(x));
  const om = t.match(/o-?\s?(1\d{3})/);
  const lines = (arr) => arr.map((x) => '• ' + x).join('\n');

  if (om) {
    const o = D.orders.find((x) => x.id === 'O-' + om[1]);
    if (o) { const p = D.products.find((x) => x.id === o.product_id); const s = D.suppliers.find((x) => x.id === p?.primary_supplier);
      return `Order ${o.id} is ${o.customer}'s ${o.tier} order for ${o.qty} x ${p?.name}, worth ${inr(o.value)}, due in ${dueIn(o)} days. Status: ${o.status}. It depends on ${s?.name} (${s?.city}).`; }
  }
  if (has('help', 'what can you', 'who are you', 'what do you do'))
    return 'I am the OpsPilot Copilot. I can explain your risks, suppliers, stock, customers, revenue and what the crew has done so far. Try: "What is my biggest risk?" or "Which supplier is least reliable?"';
  if (has('risk', 'danger', 'threat', 'exposed', 'worry', 'alert', 'signal')) {
    const top = signals.filter((s) => s.exposure.orders > 0).slice(0, 3);
    if (!top.length) return 'No active signal currently puts open orders at risk. The Sentinel keeps watching.';
    return `The Sentinel is tracking ${signals.length} signals. The ones that put real orders at risk:\n` + lines(top.map((s) => `${s.title} (${s.supplier}): ${s.exposure.orders} order(s), about ${inr(s.exposure.value)} at risk, ${Math.round(s.confidence * 100)}% confidence`)) + '\nUse "Let the crew handle it" on the Command Center to resolve one.';
  }
  if (has('reliab', 'best supplier', 'worst supplier', 'supplier', 'vendor')) {
    const arr = [...suppliers].sort((a, b) => a.reliability - b.reliability);
    return 'Suppliers from least to most reliable:\n' + lines(arr.map((s) => `${s.name} (${s.city}): ${s.reliability}% reliable, risk score ${s.risk}/100`));
  }
  if (has('stock', 'inventory', 'low', 'shortage')) {
    const arr = D.products.map((p) => ({ p, demand: D.orders.filter((o) => o.product_id === p.id).reduce((s, o) => s + o.qty, 0) })).sort((a, b) => (a.p.stock - a.demand) - (b.p.stock - b.demand));
    return 'Stock versus open demand (tightest first):\n' + lines(arr.map(({ p, demand }) => `${p.name}: ${p.stock} in stock, ${demand} on order${p.stock < demand ? ` (short by ${demand - p.stock})` : ''}`));
  }
  if (has('customer', 'client', 'enterprise', 'biggest buyer')) {
    const by = {}; open.forEach((o) => { by[o.customer] = (by[o.customer] || 0) + o.value; });
    const arr = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return 'Top customers by open order value:\n' + lines(arr.map(([c, v]) => `${c}: ${inr(v)}`));
  }
  if (has('revenue', 'value', 'worth', 'money', 'how much')) {
    return `There are ${open.length} open orders worth ${inr(total)} in total. ${A.runs ? `So far the crew has protected ${inr(A.revenue)} of revenue across ${A.runs} run(s).` : 'The crew has not run yet. Launch a scenario to see revenue protected.'}`;
  }
  if (has('policy', 'limit', 'approve', 'rule', 'guardian', 'safe')) {
    return 'The Guardian enforces a fixed policy: purchase orders above ₹50,000 need a human, suppliers below 90% reliability need a human, prices more than 15% above normal need a human, and enterprise customer emails need review. Everything else is auto-approved. You can change the autonomy level on the Command Center.';
  }
  if (has('run', 'history', 'saved', 'protected', 'did the crew', 'done so far', 'time')) {
    return A.runs ? `The crew has completed ${A.runs} run(s): ${A.orders} orders saved, ${inr(A.revenue)} revenue protected, ${A.hours} hours of manual work replaced (about ${A.speedup}x faster), ${A.emails} customer emails and ${A.tickets} escalation ticket(s).`
      : 'The crew has not completed a run yet. Pick a scenario on the Command Center and I will report the results here.';
  }
  return `I am not sure about that one, but here is a quick picture: ${open.length} open orders worth ${inr(total)}, ${signals.filter((s) => s.exposure.orders > 0).length} active risk signals, and the most fragile supplier is ${suppliers[0].name} (risk ${suppliers[0].risk}/100). Ask me about risks, suppliers, stock, customers, revenue or policy.`;
}
