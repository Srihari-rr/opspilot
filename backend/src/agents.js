// The multi-agent crew: Planner -> Analyst -> Sourcing -> Comms -> Guardian -> (human) -> Executor -> Reporter
import { db } from './db.js';
import { bus } from './bus.js';
import { askJSON, aiEnabled } from './llm.js';
import { listSuppliers, getSupplier, primaryTerms, alternatives, computeExposure } from './tools.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
export const POLICY = { poLimit: 50000, minReliability: 0.9, maxPremium: 0.15 };

const pending = new Map(); // runId -> resolve function for the human approval gate

function emit(runId, agent, type, title, data = {}) {
  const ts = new Date().toISOString();
  const r = db.prepare('INSERT INTO events (run_id,agent,type,title,data,ts) VALUES (?,?,?,?,?,?)')
    .run(runId, agent, type, title, JSON.stringify(data), ts);
  bus.emit(`run:${runId}`, { id: Number(r.lastInsertRowid), run_id: runId, agent, type, title, data, ts });
}

// Per-run AI usage meter (calls, tokens) so we can report cost per resolved incident.
const meters = new Map();
const aiStats = (runId) => {
  const m = meters.get(runId) || { calls: 0, in: 0, out: 0 };
  // Gemini 2.5 Flash list price (approx): $0.30 / 1M input, $2.50 / 1M output tokens; 1 USD ~ Rs 88
  return { ai_calls: m.calls, ai_tokens: m.in + m.out, ai_cost_inr: Math.round(((m.in * 0.3 + m.out * 2.5) / 1e6) * 88 * 100) / 100 };
};

// Ask the LLM; if there is no key / the call fails, use the rule-based fallback so the demo never breaks.
async function think(runId, agent, system, prompt, fallback) {
  try {
    const out = await askJSON({ system, prompt });
    const m = meters.get(runId) || { calls: 0, in: 0, out: 0 };
    m.calls++; m.in += out?.__usage?.in || 0; m.out += out?.__usage?.out || 0; meters.set(runId, m);
    return { out, source: 'gemini' };
  } catch (e) {
    if (e.message !== 'NO_KEY') emit(runId, agent, 'note', 'AI call failed - switched to built-in rule engine', { error: String(e.message).slice(0, 160) });
    return { out: fallback(), source: 'rules' };
  }
}

export function decide(runId, decisions) {
  const fn = pending.get(Number(runId));
  if (!fn) return false;
  fn(decisions);
  return true;
}

const AUTONOMY_LIMIT = { cautious: 0, balanced: POLICY.poLimit, autonomous: POLICY.poLimit * 2 };

export async function runPipeline(runId, incident, autonomy = 'balanced') {
  const poLimit = AUTONOMY_LIMIT[autonomy] ?? POLICY.poLimit;
  const t0 = Date.now();
  const setStatus = (s) => db.prepare('UPDATE runs SET status=? WHERE id=?').run(s, runId);
  try {
    setStatus('running');
    emit(runId, 'system', 'status', 'Incident received', { incident, ai: aiEnabled() ? 'gemini' : 'offline-simulation' });
    await sleep(500);

    /* ---------------- 1. PLANNER ---------------- */
    emit(runId, 'planner', 'thought', 'Reading the incident and deciding what to do...');
    const suppliers = listSuppliers();
    const planFallback = () => {
      const low = incident.toLowerCase();
      const s = suppliers.find((x) => low.includes(x.name.toLowerCase()) || low.includes(x.id.toLowerCase())
        || low.includes(x.name.split(' ')[0].toLowerCase())) || suppliers[0];
      const days = Number((low.match(/(\d+)\s*-?\s*day/) || [])[1]) || null;
      const type = /recall|defect|quality|contaminat|fail/.test(low) ? 'recall' : /capacity|shortage|strike at|fire|half/.test(low) ? 'capacity' : 'delay';
      const delay = days || (type === 'recall' ? 14 : type === 'capacity' ? 5 : 9);
      return {
        supplier_id: s.id, disruption_type: type, delay_days: delay,
        severity: delay >= 12 ? 'critical' : delay >= 7 ? 'high' : 'medium',
        summary: `${s.name} disruption (${type}) expected to last about ${delay} days.`,
        plan: ['Find every open order that depends on the affected supplier', 'Check stock and work out which orders will be late',
          'Choose the best alternate supplier for each shortage', 'Draft personalised messages for impacted customers',
          'Check every action against company policy, ask a human only when needed', 'Execute approved actions across all systems'],
      };
    };
    const { out: planRaw, source: pSrc } = await think(runId, 'planner',
      'You are the Planner agent of an autonomous supply-chain operations crew. Respond with JSON only.',
      `Incident reported by a business: "${incident}"\nKnown suppliers: ${JSON.stringify(suppliers)}\n` +
      `Return JSON: {"supplier_id": one id from the list that is affected, "disruption_type": "delay"|"recall"|"capacity", ` +
      `"delay_days": integer days of disruption (estimate if not given), "severity": "medium"|"high"|"critical", ` +
      `"summary": one sentence, "plan": array of exactly 6 short imperative steps the crew will follow}`, planFallback);
    let planned = planRaw;
    if (!getSupplier(planned.supplier_id) || !Number.isFinite(Number(planned.delay_days))) planned = planFallback();
    planned.delay_days = Math.max(1, Math.min(60, Math.round(Number(planned.delay_days))));
    const supplier = getSupplier(planned.supplier_id);
    emit(runId, 'planner', 'result', 'Incident understood', { ...planned, supplier_name: supplier.name, source: pSrc });
    emit(runId, 'planner', 'plan', 'Execution plan created', { steps: planned.plan });
    await sleep(700);

    /* ---------------- 2. ANALYST ---------------- */
    const blocked = planned.disruption_type === 'recall';
    emit(runId, 'analyst', 'tool', 'get_open_orders(supplier)', { supplier: supplier.name });
    const exposure = computeExposure(supplier.id, { blocked });
    await sleep(500);
    const allOrders = exposure.flatMap((e) => e.orders);
    emit(runId, 'analyst', 'tool', 'check_inventory(products)', {
      products: exposure.map((e) => ({ product: e.product.name, stock: e.product.stock, usable: e.effectiveStock })),
    });
    await sleep(500);
    const shortOrders = allOrders.filter((o) => o.shortage > 0);
    const primEta = (pid) => planned.delay_days + (primaryTerms(pid)?.lead_days || 0);
    const baselineLate = shortOrders.filter((o) => o.due_in_days < primEta(o.product_id));
    const revenueExposed = shortOrders.reduce((s, o) => s + (o.value * o.shortage) / o.qty, 0);
    emit(runId, 'analyst', 'tool', 'simulate_disruption(delay_days)', { delay_days: planned.delay_days, blocked_stock: blocked });
    await sleep(500);

    const exposureBrief = {
      openOrdersAffected: allOrders.length, ordersShort: shortOrders.length, ordersLateIfNoAction: baselineLate.length,
      revenueExposed: Math.round(revenueExposed),
      perProduct: exposure.map((e) => ({ product: e.product.name, stock: e.effectiveStock, shortage: e.totalShortage, earliestShortDueDays: e.earliestShortDue })),
    };
    const { out: insight } = await think(runId, 'analyst',
      'You are the Analyst agent. Be concrete and brief. JSON only.',
      `Disruption: ${planned.summary}\nExposure data: ${JSON.stringify(exposureBrief)}\n` +
      `Return JSON: {"headline": one sentence with the key numbers, "insights": array of 3 short insights}`,
      () => ({
        headline: `${exposureBrief.ordersShort} of ${allOrders.length} open orders are short on stock; ${exposureBrief.ordersLateIfNoAction} would be late if we do nothing (${inr(revenueExposed)} exposed).`,
        insights: exposure.filter((e) => e.totalShortage > 0).map((e) => `${e.product.name}: short by ${e.totalShortage} units, earliest deadline in ${e.earliestShortDue} day(s).`).slice(0, 3),
      }));
    emit(runId, 'analyst', 'result', insight.headline, { ...exposureBrief, insights: insight.insights, orders: shortOrders.map((o) => ({ id: o.id, customer: o.customer, tier: o.tier, due_in_days: o.due_in_days, shortage: o.shortage })) });
    await sleep(700);

    if (!shortOrders.length) {
      emit(runId, 'reporter', 'summary', 'No action needed', { headline: 'Current stock covers all open orders. No action required.', metrics: {}, next_steps: [] });
      db.prepare('UPDATE runs SET summary=? WHERE id=?').run(JSON.stringify({ headline: 'No action needed' }), runId);
      setStatus('completed');
      return;
    }

    /* ---------------- 3. SOURCING ---------------- */
    const needs = exposure.filter((e) => e.totalShortage > 0).map((e) => {
      const cands = alternatives(e.product.id, supplier.id);
      const base = primaryTerms(e.product.id);
      return { product_id: e.product.id, product: e.product.name, shortage: e.totalShortage, qty_to_order_min: Math.ceil(e.totalShortage * 1.1),
        earliest_deadline_days: e.earliestShortDue, primary_unit_cost: base?.unit_cost, candidates: cands };
    });
    for (const n of needs) {
      emit(runId, 'sourcing', 'tool', `find_alternate_suppliers(${n.product_id})`, { product: n.product, candidates: n.candidates });
      await sleep(450);
    }
    const sourcingFallback = () => needs.map((n) => {
      const onTime = n.candidates.filter((c) => c.lead_days <= n.earliest_deadline_days);
      const pool = onTime.length ? onTime : [...n.candidates].sort((a, b) => a.lead_days - b.lead_days).slice(0, 1);
      const best = [...pool].sort((a, b) => a.unit_cost / a.reliability - b.unit_cost / b.reliability)[0];
      return { product_id: n.product_id, supplier_id: best.supplier_id, qty: n.qty_to_order_min,
        reasoning: onTime.length ? `${best.name} can deliver in ${best.lead_days} day(s), before the ${n.earliest_deadline_days}-day deadline, at the best price/reliability balance.`
          : `No supplier can meet the ${n.earliest_deadline_days}-day deadline; ${best.name} is the fastest at ${best.lead_days} days.` };
    });
    emit(runId, 'sourcing', 'thought', 'Weighing price, speed and reliability of each supplier...');
    const { out: srcRaw, source: sSrc } = await think(runId, 'sourcing',
      'You are the Sourcing agent. Pick the best alternate supplier per product, trading off deadline, cost and reliability. JSON only.',
      `Needs: ${JSON.stringify(needs)}\nReturn JSON: {"decisions":[{"product_id","supplier_id" (must be one of that product's candidates),"qty" (>= qty_to_order_min),"reasoning": one sentence}]}`,
      () => ({ decisions: sourcingFallback() }));
    const fb = sourcingFallback();
    const decisions = needs.map((n, i) => {
      const d = (srcRaw.decisions || []).find((x) => x.product_id === n.product_id);
      const ok = d && n.candidates.some((c) => c.supplier_id === d.supplier_id) && Number(d.qty) >= n.shortage;
      return ok ? { ...d, qty: Math.round(Number(d.qty)) } : fb[i];
    });
    const poPlans = decisions.map((d) => {
      const n = needs.find((x) => x.product_id === d.product_id);
      const c = n.candidates.find((x) => x.supplier_id === d.supplier_id);
      const premium = n.primary_unit_cost ? (c.unit_cost - n.primary_unit_cost) / n.primary_unit_cost : 0;
      return { product_id: d.product_id, product: n.product, supplier_id: c.supplier_id, supplier: c.name, qty: d.qty, unit_cost: c.unit_cost,
        total: d.qty * c.unit_cost, eta_days: c.lead_days, reliability: c.reliability, premium, reasoning: d.reasoning };
    });
    emit(runId, 'sourcing', 'result', `Selected ${poPlans.length} alternate supplier(s)`, { purchase_orders: poPlans, source: sSrc });
    await sleep(700);

    // Work out the outcome of each order under this plan
    const etaFor = (pid) => poPlans.find((p) => p.product_id === pid)?.eta_days ?? Infinity;
    const outcomes = shortOrders.map((o) => {
      const eta = etaFor(o.product_id);
      return { ...o, eta, late: o.due_in_days < eta, days_late: Math.max(0, eta - o.due_in_days) };
    });
    const lateNow = outcomes.filter((o) => o.late);
    const secured = outcomes.filter((o) => !o.late);

    /* ---------------- 4. COMMS ---------------- */
    const mailTargets = [...lateNow, ...secured.filter((o) => o.tier === 'enterprise')];
    emit(runId, 'comms', 'thought', `Drafting ${mailTargets.length} personalised customer message(s)...`);
    const mailFallback = () => ({
      emails: mailTargets.map((o) => o.late ? {
        order_id: o.id, subject: `Update on your order ${o.id}: a short delay`,
        body: `Hi ${o.customer} team,\n\nA disruption at one of our suppliers means order ${o.id} may reach you about ${o.days_late} day(s) later than promised. ` +
          `We have already secured replacement stock and will ship ${o.allocated > 0 ? `the ${o.allocated} units we have right now immediately, and the rest ` : 'it '}as soon as it arrives.\n\n` +
          `We are sorry for the inconvenience. ${o.tier === 'enterprise' ? 'Your account manager will call you today.' : 'Reply to this email if you need anything.'}\n\nTeam OpsPilot`,
      } : {
        order_id: o.id, subject: `Good news: your order ${o.id} is protected`,
        body: `Hi ${o.customer} team,\n\nA supplier issue came up, but we acted early and secured alternate stock. Order ${o.id} is still on track to arrive by its due date.\n\nNo action needed from you.\n\nTeam OpsPilot`,
      }),
    });
    const { out: mailRaw, source: mSrc } = await think(runId, 'comms',
      'You are the Comms agent. Write short, warm, honest customer emails (max 70 words each). JSON only.',
      `Disruption: ${planned.summary}\nOrders needing a message: ${JSON.stringify(mailTargets.map((o) => ({ order_id: o.id, customer: o.customer, tier: o.tier, late: o.late, days_late: o.days_late, units_available_now: o.allocated })))}\n` +
      `Return JSON: {"emails":[{"order_id","subject","body"}]} - one per order. If late, apologise, state the delay in days and the plan. If not late, reassure.`, mailFallback);
    const emails = mailTargets.map((o) => (mailRaw.emails || []).find((e) => e.order_id === o.id && e.subject && e.body) || mailFallback().emails.find((e) => e.order_id === o.id));
    emit(runId, 'comms', 'result', `${emails.length} message(s) drafted`, { count: emails.length, source: mSrc });
    await sleep(600);

    /* ---------------- 5. GUARDIAN (policy engine) ---------------- */
    emit(runId, 'guardian', 'thought', `Checking every proposed action against company policy (autonomy: ${autonomy})...`, { policy: { ...POLICY, poLimit }, autonomy });
    await sleep(700);
    const actions = [];
    const addAction = (type, payload, needs, risk, reason) => {
      const r = db.prepare('INSERT INTO actions (run_id,type,payload,risk,needs_approval,reason,status) VALUES (?,?,?,?,?,?,?)')
        .run(runId, type, JSON.stringify(payload), risk, needs ? 1 : 0, reason, needs ? 'pending_approval' : 'auto_approved');
      const a = { id: Number(r.lastInsertRowid), type, payload, risk, needs_approval: needs, reason, status: needs ? 'pending_approval' : 'auto_approved' };
      actions.push(a);
      return a;
    };
    const poActionByProduct = {};
    for (const p of poPlans) {
      const why = [];
      if (p.total > poLimit) why.push(poLimit === 0 ? 'cautious mode: every purchase order needs a human' : `order value ${inr(p.total)} is above the ${inr(poLimit)} auto-approval limit`);
      if (p.reliability < POLICY.minReliability) why.push(`supplier reliability ${(p.reliability * 100).toFixed(0)}% is below ${POLICY.minReliability * 100}%`);
      if (p.premium > POLICY.maxPremium) why.push(`price is ${(p.premium * 100).toFixed(0)}% above the usual supplier`);
      poActionByProduct[p.product_id] = addAction('PURCHASE_ORDER', p, why.length > 0, why.length ? 'high' : 'low',
        why.length ? 'Needs human approval: ' + why.join('; ') : 'Within policy - auto-approved');
    }
    for (const o of outcomes) {
      const po = poActionByProduct[o.product_id];
      addAction('ORDER_UPDATE', { order_id: o.id, customer: o.customer, status: o.late ? `Delayed ${o.days_late}d - customer notified` : 'Secured - resupply arriving in time',
        note: o.late ? `Late by ${o.days_late} day(s)` : 'Alternate stock ordered', depends_on_action: po.id }, false, 'low', 'Routine status update - auto-approved');
    }
    for (const e of emails) {
      const o = mailTargets.find((x) => x.id === e.order_id);
      const ent = o.tier === 'enterprise';
      addAction('CUSTOMER_EMAIL', { order_id: o.id, to: o.customer, tier: o.tier, late: o.late, subject: e.subject, body: e.body }, ent, ent ? 'medium' : 'low',
        ent ? 'Needs human review: enterprise customer communication' : 'Standard customer message - auto-approved');
    }
    const lateEnterprise = lateNow.filter((o) => o.tier === 'enterprise');
    if (lateEnterprise.length) {
      addAction('ESCALATION_TICKET', { title: `Call ${[...new Set(lateEnterprise.map((o) => o.customer))].join(', ')} about delayed orders`, severity: 'high',
        detail: lateEnterprise.map((o) => `${o.id} (${o.customer}) late by ${o.days_late}d`).join('; ') }, false, 'low', 'Escalation to account managers - auto-approved');
    }
    const needApproval = actions.filter((a) => a.needs_approval);
    emit(runId, 'guardian', 'result', `${actions.length} actions checked: ${actions.length - needApproval.length} auto-approved, ${needApproval.length} need a human`,
      { actions, auto: actions.length - needApproval.length, flagged: needApproval.length });
    await sleep(600);

    /* ---------------- 6. HUMAN GATE ---------------- */
    let decisionsMap = {};
    if (needApproval.length) {
      setStatus('awaiting_approval');
      emit(runId, 'guardian', 'approval', 'Waiting for human approval', { action_ids: needApproval.map((a) => a.id) });
      decisionsMap = await new Promise((resolve) => pending.set(runId, resolve));
      pending.delete(runId);
      setStatus('running');
      const approved = needApproval.filter((a) => decisionsMap[a.id] !== 'reject').length;
      emit(runId, 'guardian', 'result', `Human decision received: ${approved} approved, ${needApproval.length - approved} rejected`, { decisions: decisionsMap });
      await sleep(500);
    }
    for (const a of actions) {
      if (a.needs_approval) a.status = decisionsMap[a.id] === 'reject' ? 'rejected' : 'approved';
      else a.status = 'approved';
      db.prepare('UPDATE actions SET status=? WHERE id=?').run(a.status, a.id);
    }

    /* ---------------- 7. EXECUTOR ---------------- */
    emit(runId, 'executor', 'thought', 'Executing approved actions across Procurement, Orders, Email and Ticketing systems...');
    const poOk = (id) => actions.find((a) => a.id === id)?.status === 'approved';
    let counts = { po: 0, mail: 0, upd: 0, ticket: 0, skipped: 0 };
    for (const a of actions) {
      await sleep(350);
      if (a.status === 'rejected') { counts.skipped++; emit(runId, 'executor', 'action', `Skipped (rejected): ${a.type}`, { type: a.type, status: 'skipped', payload: a.payload }); continue; }
      const p = a.payload;
      if (a.type === 'PURCHASE_ORDER') {
        db.prepare('INSERT INTO purchase_orders (run_id,supplier_id,product_id,qty,total,eta_days) VALUES (?,?,?,?,?,?)').run(runId, p.supplier_id, p.product_id, p.qty, p.total, p.eta_days);
        counts.po++;
        emit(runId, 'executor', 'action', `Purchase order placed: ${p.qty} x ${p.product} from ${p.supplier}`, { type: a.type, status: 'done', total: p.total, eta_days: p.eta_days });
      } else if (a.type === 'ORDER_UPDATE') {
        const ok = poOk(p.depends_on_action);
        db.prepare('UPDATE orders SET status=?, note=? WHERE id=?').run(ok ? p.status : 'At risk - resupply not approved', ok ? p.note : 'Awaiting decision', p.order_id);
        counts.upd++;
        emit(runId, 'executor', 'action', `Order ${p.order_id} (${p.customer}) -> ${ok ? p.status : 'At risk - resupply not approved'}`, { type: a.type, status: 'done' });
      } else if (a.type === 'CUSTOMER_EMAIL') {
        db.prepare('INSERT INTO outbox (run_id,order_id,to_name,subject,body) VALUES (?,?,?,?,?)').run(runId, p.order_id, p.to, p.subject, p.body);
        counts.mail++;
        emit(runId, 'executor', 'action', `Email sent to ${p.to} (order ${p.order_id})`, { type: a.type, status: 'done', subject: p.subject });
      } else if (a.type === 'ESCALATION_TICKET') {
        db.prepare('INSERT INTO tickets (run_id,title,severity,detail) VALUES (?,?,?,?)').run(runId, p.title, p.severity, p.detail);
        counts.ticket++;
        emit(runId, 'executor', 'action', `Escalation ticket created: ${p.title}`, { type: a.type, status: 'done' });
      }
    }

    /* ---------------- 8. REPORTER ---------------- */
    const approvedPOs = poPlans.filter((p) => poOk(poActionByProduct[p.product_id].id));
    const savedOrders = outcomes.filter((o) => !o.late && poOk(poActionByProduct[o.product_id].id));
    const protectedNow = baselineLate.filter((b) => savedOrders.some((s) => s.id === b.id));
    const revenueProtected = protectedNow.reduce((s, o) => s + (o.value * o.shortage) / o.qty, 0);
    const manualMinutes = allOrders.length * 6 + approvedPOs.length * 25 + counts.mail * 8 + 20;
    const metrics = {
      orders_analyzed: allOrders.length, orders_protected: protectedNow.length, revenue_protected: Math.round(revenueProtected),
      still_late: lateNow.length, po_placed: counts.po, po_value: Math.round(approvedPOs.reduce((s, p) => s + p.total, 0)),
      emails_sent: counts.mail, tickets: counts.ticket, actions_total: actions.length, actions_skipped: counts.skipped,
      manual_minutes_saved: manualMinutes, agent_seconds: Math.round((Date.now() - t0) / 1000),
    };
    const { out: sum } = await think(runId, 'reporter', 'You are the Reporter agent writing an executive summary. JSON only.',
      `Incident: ${planned.summary}\nMetrics: ${JSON.stringify(metrics)}\nReturn JSON: {"headline": one sentence, "narrative": 2-3 sentences for a business owner, "next_steps": array of 3 short follow-ups}`,
      () => ({
        headline: `${metrics.orders_protected} order(s) saved from delay, ${inr(metrics.revenue_protected)} of revenue protected.`,
        narrative: `After the ${supplier.name} disruption, the crew analysed ${metrics.orders_analyzed} open orders, placed ${metrics.po_placed} purchase order(s) worth ${inr(metrics.po_value)}, and sent ${metrics.emails_sent} customer message(s). ` +
          `${metrics.still_late} order(s) remain late despite the best possible resupply and have been escalated. This would have taken roughly ${Math.round(metrics.manual_minutes_saved / 60 * 10) / 10} hours manually.`,
        next_steps: ['Confirm delivery dates with the new suppliers', 'Follow up with escalated enterprise customers', 'Review whether to add a backup supplier for this component'],
      }));
    Object.assign(metrics, aiStats(runId)); meters.delete(runId);
    emit(runId, 'reporter', 'summary', sum.headline, { ...sum, metrics });
    db.prepare('UPDATE runs SET summary=?, status=? WHERE id=?').run(JSON.stringify({ ...sum, metrics, autonomy }), 'completed', runId);
    emit(runId, 'system', 'status', 'Run completed', { status: 'completed' });
  } catch (err) {
    console.error('Pipeline error', err);
    emit(runId, 'system', 'error', 'The run failed: ' + err.message, {});
    db.prepare("UPDATE runs SET status='failed' WHERE id=?").run(runId);
  }
}
