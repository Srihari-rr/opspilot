import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db, ensureSeed, seedDemoData } from './db.js';
import { bus } from './bus.js';
import { runPipeline, decide, POLICY } from './agents.js';
import { aiEnabled, askJSON } from './llm.js';
import { buildSignals, analytics, answerQuestion, copilotContext } from './shared/insights.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

ensureSeed();
const app = express();
const SECRET = process.env.JWT_SECRET || 'dev-secret';
const origins = (process.env.FRONTEND_URL || process.env.CLIENT_ORIGIN || '').split(',').map((x) => x.trim().replace(/\/$/, '')).filter(Boolean);
app.use(cors({ origin: origins.length ? origins : true }));
app.use(express.json());

const sign = (u) => jwt.sign({ id: u.id, name: u.name, email: u.email }, SECRET, { expiresIn: '7d' });
function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '') || req.query.token;
  try { req.user = jwt.verify(token, SECRET); next(); } catch { res.status(401).json({ error: 'Please log in again' }); }
}
const validate = (schema) => (req, res, next) => {
  const r = schema.safeParse(req.body);
  if (!r.success) return res.status(400).json({ error: r.error.issues.map((i) => i.message).join(', ') });
  req.body = r.data; next();
};

app.get('/api/health', (_, res) => res.json({ ok: true, ai: aiEnabled() ? 'gemini' : 'offline-simulation', policy: POLICY }));

app.post('/api/auth/register', validate(z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(6, 'Password needs 6+ characters') })), (req, res) => {
  const { name, email, password } = req.body;
  if (db.prepare('SELECT id FROM users WHERE email=?').get(email)) return res.status(409).json({ error: 'Email already registered' });
  const r = db.prepare('INSERT INTO users (name,email,password_hash) VALUES (?,?,?)').run(name, email, bcrypt.hashSync(password, 10));
  const user = { id: Number(r.lastInsertRowid), name, email };
  res.json({ token: sign(user), user });
});
app.post('/api/auth/login', validate(z.object({ email: z.string().email(), password: z.string().min(1) })), (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE email=?').get(req.body.email);
  if (!u || !bcrypt.compareSync(req.body.password, u.password_hash)) return res.status(401).json({ error: 'Wrong email or password' });
  res.json({ token: sign(u), user: { id: u.id, name: u.name, email: u.email } });
});

// Business systems snapshot (what the agents act on)
const getSystems = () => ({
  supplier_products: db.prepare('SELECT * FROM supplier_products').all(),
  suppliers: db.prepare('SELECT * FROM suppliers').all(),
  products: db.prepare('SELECT p.*, s.name supplier_name FROM products p JOIN suppliers s ON s.id=p.primary_supplier').all(),
  orders: db.prepare('SELECT o.*, p.name product_name FROM orders o JOIN products p ON p.id=o.product_id ORDER BY o.due_date').all(),
  purchase_orders: db.prepare('SELECT po.*, s.name supplier_name, p.name product_name FROM purchase_orders po JOIN suppliers s ON s.id=po.supplier_id JOIN products p ON p.id=po.product_id ORDER BY po.id DESC').all(),
  outbox: db.prepare('SELECT * FROM outbox ORDER BY id DESC').all(),
  tickets: db.prepare('SELECT * FROM tickets ORDER BY id DESC').all(),
});
app.get('/api/systems', auth, (_, res) => res.json(getSystems()));
const myRuns = (uid) => db.prepare('SELECT id, incident, status, summary, created_at FROM runs WHERE user_id=? ORDER BY id DESC LIMIT 100').all(uid).map((r) => ({ ...r, summary: r.summary ? JSON.parse(r.summary) : null }));

// Sentinel: proactive risk signals + supplier risk scores
app.get('/api/signals', auth, (_, res) => res.json(buildSignals(getSystems())));
// Analytics across all crew runs
app.get('/api/insights', auth, (req, res) => {
  const runs = myRuns(req.user.id);
  const g = { auto: 0, human_approved: 0, rejected: 0, pending: 0 };
  if (runs.length) {
    const ids = runs.map((r) => r.id).join(',');
    for (const r of db.prepare(`SELECT needs_approval n, status s, COUNT(*) c FROM actions WHERE run_id IN (${ids}) GROUP BY n, s`).all()) {
      if (!r.n) g.auto += r.c; else if (r.s === 'rejected') g.rejected += r.c; else if (r.s === 'pending_approval') g.pending += r.c; else g.human_approved += r.c;
    }
  }
  res.json({ ...analytics(runs), governance: g });
});
// Copilot: answers questions about the business. Gemini when available, rules otherwise.
app.post('/api/ask', auth, validate(z.object({ question: z.string().min(2).max(300) })), async (req, res) => {
  const D = getSystems(); const runs = myRuns(req.user.id);
  if (aiEnabled()) {
    try {
      const out = await askJSON({
        system: 'You are the OpsPilot Copilot, an operations analyst. Answer ONLY from the JSON business data given. Be concise (max 5 short lines, plain text, use "• " bullets if listing). Use Indian Rupee formatting. JSON only.',
        prompt: `Business data: ${JSON.stringify(copilotContext(D, runs))}\nQuestion: ${req.body.question}\nReturn JSON: {"answer": string}`,
      });
      if (out?.answer) return res.json({ answer: String(out.answer), source: 'gemini' });
    } catch (e) { console.error('Copilot Gemini fallback:', e.message); }
  }
  res.json({ answer: answerQuestion(req.body.question, D, runs), source: 'rules' });
});
app.post('/api/reset', auth, (_, res) => { seedDemoData(); res.json({ ok: true }); });

app.post('/api/runs', auth, validate(z.object({ incident: z.string().min(8, 'Describe the incident in a sentence').max(600), autonomy: z.enum(['cautious', 'balanced', 'autonomous']).optional() })), (req, res) => {
  const r = db.prepare("INSERT INTO runs (user_id,incident,status) VALUES (?,?,'running')").run(req.user.id, req.body.incident);
  const id = Number(r.lastInsertRowid);
  setTimeout(() => runPipeline(id, req.body.incident, req.body.autonomy || 'balanced'), 200);
  res.json({ id });
});
app.get('/api/runs', auth, (req, res) => res.json(myRuns(req.user.id).slice(0, 30)));
app.get('/api/runs/:id', auth, (req, res) => {
  const run = db.prepare('SELECT * FROM runs WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  res.json({ ...run, summary: run.summary ? JSON.parse(run.summary) : null,
    events: db.prepare('SELECT * FROM events WHERE run_id=? ORDER BY id').all(run.id).map((e) => ({ ...e, data: JSON.parse(e.data) })),
    actions: db.prepare('SELECT * FROM actions WHERE run_id=?').all(run.id).map((a) => ({ ...a, payload: JSON.parse(a.payload) })) });
});
// Live stream of agent events (Server-Sent Events)
app.get('/api/runs/:id/stream', auth, (req, res) => {
  const id = Number(req.params.id);
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  const send = (e) => res.write(`data: ${JSON.stringify(e)}\n\n`);
  let lastId = 0;
  const handler = (e) => { if (e.id > lastId) { lastId = e.id; send(e); } };
  bus.on(`run:${id}`, handler);
  for (const e of db.prepare('SELECT * FROM events WHERE run_id=? ORDER BY id').all(id)) { lastId = e.id; send({ ...e, data: JSON.parse(e.data) }); }
  const ping = setInterval(() => res.write(': ping\n\n'), 15000);
  req.on('close', () => { clearInterval(ping); bus.off(`run:${id}`, handler); });
});
app.post('/api/runs/:id/decision', auth, validate(z.object({ decisions: z.record(z.string(), z.enum(['approve', 'reject'])) })), (req, res) => {
  res.json({ ok: decide(req.params.id, req.body.decisions) });
});

// Optional: serve the built React app from this same server (single-deploy mode)
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/dist');
if (fs.existsSync(path.join(dist, 'index.html'))) {
  app.use(express.static(dist, { setHeaders: (res, p) => { if (/sw\.js$|manifest\.webmanifest$/.test(p)) res.setHeader('Cache-Control', 'no-cache'); } }));
  app.get(/^\/(?!api\/).*/, (_, res) => res.sendFile(path.join(dist, 'index.html')));
  console.log('Serving built frontend from', dist);
}

const port = process.env.PORT || 5000;
app.listen(port, '0.0.0.0', () => console.log(`OpsPilot API running on port ${port} | AI: ${aiEnabled() ? 'Gemini' : 'offline simulation (no key)'}`));
