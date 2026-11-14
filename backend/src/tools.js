// "Tools" = the business systems the agents can read from. Plain, deterministic functions.
import { db } from './db.js';

const dueIn = (iso) => Math.max(0, Math.ceil((new Date(iso) - new Date(new Date().toISOString().slice(0, 10))) / 86400000));

export const listSuppliers = () => db.prepare('SELECT * FROM suppliers').all();
export const getSupplier = (id) => db.prepare('SELECT * FROM suppliers WHERE id=?').get(id);

export function primaryTerms(productId) {
  return db.prepare(`SELECT sp.* FROM supplier_products sp JOIN products p ON p.id=sp.product_id AND p.primary_supplier=sp.supplier_id
                     WHERE sp.product_id=?`).get(productId);
}

export function alternatives(productId, excludeSupplier) {
  return db.prepare(`SELECT sp.supplier_id, s.name, s.city, sp.unit_cost, sp.lead_days, sp.reliability
                     FROM supplier_products sp JOIN suppliers s ON s.id=sp.supplier_id
                     WHERE sp.product_id=? AND sp.supplier_id<>? ORDER BY sp.lead_days`).all(productId, excludeSupplier);
}

// Which open orders are exposed if this supplier is disrupted, and how short is stock?
export function computeExposure(supplierId, { blocked = false } = {}) {
  const products = db.prepare('SELECT * FROM products WHERE primary_supplier=?').all(supplierId);
  return products.map((p) => {
    const effectiveStock = blocked ? 0 : p.stock;
    let remaining = effectiveStock;
    const orders = db.prepare("SELECT * FROM orders WHERE product_id=? AND status='open'").all(p.id)
      .map((o) => ({ ...o, due_in_days: dueIn(o.due_date) }))
      .sort((a, b) => a.due_in_days - b.due_in_days)
      .map((o) => {
        const allocated = Math.min(o.qty, remaining);
        remaining -= allocated;
        return { ...o, allocated, shortage: o.qty - allocated };
      });
    const short = orders.filter((o) => o.shortage > 0);
    return {
      product: p, effectiveStock, orders,
      totalShortage: short.reduce((s, o) => s + o.shortage, 0),
      earliestShortDue: short.length ? Math.min(...short.map((o) => o.due_in_days)) : null,
    };
  });
}
