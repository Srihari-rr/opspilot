import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const dbPath = process.env.DB_PATH || path.resolve('data/opspilot.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT UNIQUE, password_hash TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS suppliers (id TEXT PRIMARY KEY, name TEXT, city TEXT);
CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT, sell_price REAL, primary_supplier TEXT, stock INTEGER);
CREATE TABLE IF NOT EXISTS supplier_products (supplier_id TEXT, product_id TEXT, unit_cost REAL, lead_days INTEGER, reliability REAL);
CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, customer TEXT, tier TEXT, product_id TEXT, qty INTEGER, value REAL, due_date TEXT, status TEXT, note TEXT);
CREATE TABLE IF NOT EXISTS purchase_orders (id INTEGER PRIMARY KEY AUTOINCREMENT, run_id INTEGER, supplier_id TEXT, product_id TEXT, qty INTEGER, total REAL, eta_days INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS outbox (id INTEGER PRIMARY KEY AUTOINCREMENT, run_id INTEGER, order_id TEXT, to_name TEXT, subject TEXT, body TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS tickets (id INTEGER PRIMARY KEY AUTOINCREMENT, run_id INTEGER, title TEXT, severity TEXT, detail TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS runs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, incident TEXT, status TEXT, summary TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, run_id INTEGER, agent TEXT, type TEXT, title TEXT, data TEXT, ts TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS actions (id INTEGER PRIMARY KEY AUTOINCREMENT, run_id INTEGER, type TEXT, payload TEXT, risk TEXT, needs_approval INTEGER, reason TEXT, status TEXT);
`);

const daysFromNow = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);

export function seedDemoData() {
  db.exec(`DELETE FROM suppliers; DELETE FROM products; DELETE FROM supplier_products; DELETE FROM orders;
           DELETE FROM purchase_orders; DELETE FROM outbox; DELETE FROM tickets; DELETE FROM actions;`);
  const sup = db.prepare('INSERT INTO suppliers VALUES (?,?,?)');
  [['SUP-01', 'Apex Components', 'Shenzhen'], ['SUP-02', 'Nova Plastics', 'Pune'], ['SUP-03', 'Voltix Energy', 'Chennai'],
   ['SUP-04', 'Zenith Micro', 'Bengaluru'], ['SUP-05', 'Orbit Industrial', 'Taipei'], ['SUP-06', 'PolyForm India', 'Ahmedabad'],
   ['SUP-07', 'CellCore', 'Hyderabad']].forEach((r) => sup.run(...r));

  const prod = db.prepare('INSERT INTO products VALUES (?,?,?,?,?)');
  [['P-100', 'Smart Sensor Module', 750, 'SUP-01', 70], ['P-101', 'Control Board v2', 1650, 'SUP-01', 15],
   ['P-200', 'Casing Kit', 260, 'SUP-02', 60], ['P-201', 'Cable Harness', 150, 'SUP-02', 100],
   ['P-300', 'Battery Pack 5Ah', 1100, 'SUP-03', 40]].forEach((r) => prod.run(...r));

  const sp = db.prepare('INSERT INTO supplier_products VALUES (?,?,?,?,?)');
  [['SUP-01', 'P-100', 420, 7, 0.96], ['SUP-04', 'P-100', 465, 4, 0.91], ['SUP-05', 'P-100', 395, 12, 0.88],
   ['SUP-01', 'P-101', 980, 8, 0.96], ['SUP-04', 'P-101', 1060, 5, 0.93], ['SUP-05', 'P-101', 940, 14, 0.86],
   ['SUP-02', 'P-200', 150, 5, 0.94], ['SUP-06', 'P-200', 162, 3, 0.92],
   ['SUP-02', 'P-201', 90, 4, 0.95], ['SUP-06', 'P-201', 98, 3, 0.9],
   ['SUP-03', 'P-300', 650, 6, 0.95], ['SUP-07', 'P-300', 690, 4, 0.93]].forEach((r) => sp.run(...r));

  const price = Object.fromEntries(db.prepare('SELECT id, sell_price FROM products').all().map((p) => [p.id, p.sell_price]));
  const ord = db.prepare('INSERT INTO orders VALUES (?,?,?,?,?,?,?,?,?)');
  [['O-1001', 'Zephyr Retail', 'standard', 'P-100', 40, 3], ['O-1002', 'Metro Mart', 'enterprise', 'P-100', 50, 5],
   ['O-1003', 'Kiran Electronics', 'standard', 'P-100', 30, 8], ['O-1004', 'Helix Smart Homes', 'enterprise', 'P-100', 60, 12],
   ['O-1005', 'Orbital Labs', 'standard', 'P-100', 25, 20],
   ['O-1006', 'Metro Mart', 'enterprise', 'P-101', 20, 2], ['O-1007', 'Kiran Electronics', 'standard', 'P-101', 25, 6],
   ['O-1008', 'Helix Smart Homes', 'enterprise', 'P-101', 30, 10],
   ['O-1009', 'Greenleaf Stores', 'standard', 'P-200', 30, 4], ['O-1010', 'Metro Mart', 'enterprise', 'P-200', 40, 7],
   ['O-1011', 'Zephyr Retail', 'standard', 'P-200', 30, 15],
   ['O-1012', 'Kiran Electronics', 'standard', 'P-201', 60, 6], ['O-1013', 'Helix Smart Homes', 'enterprise', 'P-201', 80, 9],
   ['O-1014', 'Orbital Labs', 'enterprise', 'P-300', 30, 3], ['O-1015', 'Greenleaf Stores', 'standard', 'P-300', 35, 7],
   ['O-1016', 'Zephyr Retail', 'standard', 'P-300', 20, 10]]
    .forEach(([id, c, t, p, q, d]) => ord.run(id, c, t, p, q, q * price[p], daysFromNow(d), 'open', ''));
}

export function ensureSeed() {
  const demo = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@opspilot.ai');
  if (!demo) db.prepare('INSERT INTO users (name,email,password_hash) VALUES (?,?,?)')
    .run('Demo Manager', 'demo@opspilot.ai', bcrypt.hashSync('demo1234', 10));
  if (!db.prepare('SELECT COUNT(*) c FROM orders').get().c) seedDemoData();
  db.prepare("UPDATE runs SET status='interrupted' WHERE status IN ('running','awaiting_approval')").run();
}
