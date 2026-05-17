const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const db       = require('../config/db');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const email = (req.body.email || '').toLowerCase().trim();
  const password = (req.body.password || '').trim();

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (rows.length === 0) {
      console.log('Login failed: Email not found -', email);
      return res.status(401).json({ error: 'Invalid credentials (email not found).' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    
    if (!match) {
      console.log('Login failed: Password mismatch for -', email);
      return res.status(401).json({ error: 'Invalid credentials (wrong password).' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/auth/verify  – lightweight token check
router.post('/verify', (req, res) => {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ valid: false });
  }
  try {
    const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    res.json({ valid: true, user: payload });
  } catch {
    res.status(401).json({ valid: false });
  }
});

module.exports = router;
