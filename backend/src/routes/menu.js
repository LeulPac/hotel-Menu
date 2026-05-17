const express    = require('express');
const db         = require('../config/db');
const upload     = require('../middleware/upload');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ─── Public ──────────────────────────────────────────────────────────────────

// GET /api/menu  – all available items (public, used by customer page)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM menu_items ORDER BY category, name'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load menu.' });
  }
});

// GET /api/menu/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM menu_items WHERE id = ?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Item not found.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── Protected (admin only) ───────────────────────────────────────────────────

// POST /api/menu  – add item
router.post('/', requireAuth, upload.array('images', 5), async (req, res) => {
  const { name, category, description, price, available } = req.body;
  if (!name || !category || !price) {
    return res.status(400).json({ error: 'name, category and price are required.' });
  }
  
  const imagePaths = req.files && req.files.length > 0 ? JSON.stringify(req.files.map(f => `/uploads/${f.filename}`)) : null;

  try {
    const [result] = await db.execute(
      `INSERT INTO menu_items (name, category, description, price, image_path, available)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, category, description || '', parseFloat(price), imagePaths, available !== 'false']
    );
    const [rows] = await db.execute('SELECT * FROM menu_items WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create item.' });
  }
});

// PUT /api/menu/:id  – edit item
router.put('/:id', requireAuth, upload.array('images', 5), async (req, res) => {
  const { name, category, description, price, available } = req.body;
  try {
    const [existing] = await db.execute('SELECT * FROM menu_items WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Item not found.' });

    const item      = existing[0];
    const imagePaths = req.files && req.files.length > 0 ? JSON.stringify(req.files.map(f => `/uploads/${f.filename}`)) : item.image_path;

    await db.execute(
      `UPDATE menu_items SET name=?, category=?, description=?, price=?, image_path=?, available=?
       WHERE id=?`,
      [
        name        ?? item.name,
        category    ?? item.category,
        description ?? item.description,
        price       !== undefined ? parseFloat(price) : item.price,
        imagePaths,
        available   !== undefined ? (available !== 'false') : item.available,
        req.params.id,
      ]
    );
    const [rows] = await db.execute('SELECT * FROM menu_items WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update item.' });
  }
});

// PATCH /api/menu/:id/toggle  – toggle available flag
router.patch('/:id/toggle', requireAuth, async (req, res) => {
  try {
    await db.execute(
      'UPDATE menu_items SET available = NOT available WHERE id = ?',
      [req.params.id]
    );
    const [rows] = await db.execute('SELECT * FROM menu_items WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle item.' });
  }
});

// DELETE /api/menu/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const [result] = await db.execute('DELETE FROM menu_items WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Item not found.' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete item.' });
  }
});

module.exports = router;
