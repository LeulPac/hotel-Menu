const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'hotel_menu',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  charset:            'utf8mb4',
});

// Verify connectivity on startup & auto-verify admin credentials
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅  MySQL connected – database:', process.env.DB_NAME);
    conn.release();

    // Auto-fix/seed admin user
    const bcrypt = require('bcryptjs');
    const adminEmail = 'admin@hotel.com';
    const adminHash = bcrypt.hashSync('admin123', 10);

    try {
      const [rows] = await pool.execute('SELECT * FROM users WHERE email = ? LIMIT 1', [adminEmail]);
      if (rows.length === 0) {
        await pool.execute(
          'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
          [adminEmail, adminHash, 'admin']
        );
        console.log('💡  [DB-AutoFix] Default admin user created successfully.');
      } else {
        await pool.execute(
          'UPDATE users SET password_hash = ? WHERE email = ?',
          [adminHash, adminEmail]
        );
        console.log('💡  [DB-AutoFix] Admin credentials verified & updated to password: "admin123".');
      }
      } catch (dbErr) {
      console.warn('⚠️  [DB-AutoFix] Could not verify/update admin user. Make sure you ran "init-db.sql" first! Error:', dbErr.message);
    }

    try {
      await pool.execute('ALTER TABLE menu_items MODIFY COLUMN image_path TEXT');
    } catch (e) {
      console.warn('⚠️  [DB-AutoFix] Could not alter menu_items table:', e.message);
    }

    // Auto-fix/seed for delivery feature
    try { await pool.execute('ALTER TABLE orders MODIFY COLUMN table_number INT NULL'); } catch (e) {}
    try { await pool.execute('ALTER TABLE orders ADD COLUMN customer_name VARCHAR(255) DEFAULT NULL'); } catch (e) {}
    try { await pool.execute('ALTER TABLE orders ADD COLUMN customer_location TEXT DEFAULT NULL'); } catch (e) {}
    try { await pool.execute('ALTER TABLE orders ADD COLUMN customer_phone VARCHAR(50) DEFAULT NULL'); } catch (e) {}


  } catch (err) {
    console.error('❌  MySQL connection failed:', err.message);
    process.exit(1);
  }
})();

module.exports = pool;
