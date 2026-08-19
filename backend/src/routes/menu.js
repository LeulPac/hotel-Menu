const express    = require('express');
const db         = require('../config/db');
const { upload, uploadImage } = require('../middleware/upload');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Helper to upload files and get their URLs
async function processUploadedImages(files) {
  if (!files || files.length === 0) return null;
  const urls = [];
  for (const file of files) {
    if (file.buffer) {
      const url = await uploadImage(file);
      if (url) urls.push(url);
    }
  }
  return urls.length > 0 ? urls : null;
}

// ─── Public ──────────────────────────────────────────────────────────────────

// GET /api/menu – all available items (or all items sorted by category, name)
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM menu_items ORDER BY category, name'
    );
    res.json(rows);
  } catch (err) {
    console.error('Error loading menu:', err);
    res.status(500).json({ error: 'Failed to load menu.' });
  }
});

// GET /api/menu/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM menu_items WHERE id = $1',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Item not found.' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching item:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── Protected (admin only) ───────────────────────────────────────────────────

// POST /api/menu – add item
router.post('/', requireAuth, upload.array('images', 5), async (req, res) => {
  const { name, category, description, price, available } = req.body;
  if (!name || !category || !price) {
    return res.status(400).json({ error: 'name, category and price are required.' });
  }
  
  try {
    const uploadedUrls = await processUploadedImages(req.files);
    const imagePaths = uploadedUrls ? JSON.stringify(uploadedUrls) : null;

    const { rows } = await db.query(
      `INSERT INTO menu_items (name, category, description, price, image_path, available)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, category, description || '', parseFloat(price), imagePaths, available !== 'false']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating menu item:', err);
    res.status(500).json({ error: err.message || 'Failed to create item.' });
  }
});

// PUT /api/menu/:id – edit item
router.put('/:id', requireAuth, upload.array('images', 5), async (req, res) => {
  const { name, category, description, price, available } = req.body;
  try {
    const existingRes = await db.query('SELECT * FROM menu_items WHERE id = $1', [req.params.id]);
    if (!existingRes.rows.length) return res.status(404).json({ error: 'Item not found.' });

    const item = existingRes.rows[0];
    const uploadedUrls = await processUploadedImages(req.files);
    const imagePaths = uploadedUrls ? JSON.stringify(uploadedUrls) : item.image_path;

    const { rows } = await db.query(
      `UPDATE menu_items 
       SET name=$1, category=$2, description=$3, price=$4, image_path=$5, available=$6, updated_at=CURRENT_TIMESTAMP
       WHERE id=$7
       RETURNING *`,
      [
        name        !== undefined ? name : item.name,
        category    !== undefined ? category : item.category,
        description !== undefined ? description : item.description,
        price       !== undefined ? parseFloat(price) : item.price,
        imagePaths,
        available   !== undefined ? (available !== 'false') : item.available,
        req.params.id,
      ]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating menu item:', err);
    res.status(500).json({ error: err.message || 'Failed to update item.' });
  }
});

// PATCH /api/menu/:id/toggle – toggle available flag
router.patch('/:id/toggle', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE menu_items 
       SET available = NOT available, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Item not found.' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error toggling item:', err);
    res.status(500).json({ error: 'Failed to toggle item.' });
  }
});

// DELETE /api/menu/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query('DELETE FROM menu_items WHERE id = $1 RETURNING id', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Item not found.' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting item:', err);
    res.status(500).json({ error: 'Failed to delete item.' });
  }
});

module.exports = router;
