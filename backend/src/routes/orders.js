const express        = require('express');
const db             = require('../config/db');
const { requireAuth} = require('../middleware/auth');

const router = express.Router();

// Expose the Socket.io emitter so routes can broadcast events
let _io = null;
function setIo(io) { _io = io; }

// ─── Customer: Submit Order ───────────────────────────────────────────────────
// POST /api/orders
router.post('/', async (req, res) => {
  const { table_number, customer_name, customer_phone, customer_location, items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items[] are required.' });
  }

  let finalTable = null;
  let isDelivery = false;

  if (!table_number) {
    if (!customer_name || !customer_phone || !customer_location) {
      return res.status(400).json({ error: 'Either table_number OR delivery details (name, phone, location) are required.' });
    }
    isDelivery = true;
  } else {
    if (isNaN(parseInt(table_number)) || parseInt(table_number) < 1) {
      return res.status(400).json({ error: 'table_number must be a positive integer.' });
    }
    finalTable = parseInt(table_number);
  }

  // Verify each item exists and is available; use DB price (trust server, not client)
  try {
    const ids      = items.map(i => i.itemId);
    const placeholders = ids.map(() => '?').join(',');
    const [menuRows] = await db.execute(
      `SELECT id, name, price, available FROM menu_items WHERE id IN (${placeholders})`,
      ids
    );

    const menuMap = {};
    menuRows.forEach(r => { menuMap[r.id] = r; });

    const validatedItems = [];
    let   total          = 0;

    for (const item of items) {
      const mi = menuMap[item.itemId];
      if (!mi) return res.status(400).json({ error: `Item ${item.itemId} not found.` });
      if (!mi.available) return res.status(400).json({ error: `"${mi.name}" is currently unavailable.` });
      const qty  = parseInt(item.qty) || 1;
      const line = { itemId: mi.id, name: mi.name, qty, price: parseFloat(mi.price) };
      validatedItems.push(line);
      total += mi.price * qty;
    }

    const [result] = await db.execute(
      'INSERT INTO orders (table_number, customer_name, customer_phone, customer_location, items, total) VALUES (?, ?, ?, ?, ?, ?)',
      [finalTable, customer_name || null, customer_phone || null, customer_location || null, JSON.stringify(validatedItems), total.toFixed(2)]
    );

    const parseJson = (val) => {
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch(e) { return []; }
      }
      return val || [];
    };

    const [newOrder] = await db.execute('SELECT * FROM orders WHERE id = ?', [result.insertId]);
    const order = { ...newOrder[0], items: parseJson(newOrder[0].items) };

    // Broadcast to admin dashboard in real-time
    if (_io) _io.emit('newOrder', order);

    res.status(201).json({ success: true, orderId: result.insertId, total: order.total });
  } catch (err) {
    console.error('Order error:', err);
    res.status(500).json({ error: `Failed to place order: ${err.message}` });
  }
});

// ─── Admin: List Orders ───────────────────────────────────────────────────────
// GET /api/orders  – all orders, most recent first (with optional status filter)
router.get('/', requireAuth, async (req, res) => {
  const parseJson = (val) => {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch(e) { return []; }
    }
    return val || [];
  };

  try {
    const { status, limit = 100 } = req.query;
    let sql    = 'SELECT * FROM orders';
    const args = [];
    if (status) { sql += ' WHERE status = ?'; args.push(status); }
    sql += ' ORDER BY created_at DESC LIMIT ?';
    args.push(parseInt(limit));

    const [rows] = await db.execute(sql, args);
    const orders = rows.map(r => ({ ...r, items: parseJson(r.items) }));
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load orders.' });
  }
});

// GET /api/orders/live  – active orders (not Delivered) – for polling fallback
router.get('/live', requireAuth, async (req, res) => {
  const parseJson = (val) => {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch(e) { return []; }
    }
    return val || [];
  };

  try {
    const [rows] = await db.execute(
      "SELECT * FROM orders WHERE status != 'Delivered' ORDER BY created_at DESC"
    );
    const orders = rows.map(r => ({ ...r, items: parseJson(r.items) }));
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load live orders.' });
  }
});

// PATCH /api/orders/:id/status  – advance order status
router.patch('/:id/status', requireAuth, async (req, res) => {
  const parseJson = (val) => {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch(e) { return []; }
    }
    return val || [];
  };

  const { status } = req.body;
  const allowed    = ['New', 'Preparing', 'Ready', 'Delivered'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
  }
  try {
    await db.execute('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
    const [rows] = await db.execute('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Order not found.' });
    const order = { ...rows[0], items: parseJson(rows[0].items) };

    if (_io) _io.emit('orderUpdated', order);
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status.' });
  }
});

module.exports = { router, setIo };
