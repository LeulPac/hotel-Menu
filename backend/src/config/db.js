const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

const isProductionOrCloud = Boolean(
  connectionString || 
  process.env.NODE_ENV === 'production' || 
  (process.env.DB_HOST && !['localhost', '127.0.0.1'].includes(process.env.DB_HOST))
);

const poolConfig = connectionString
  ? {
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
    }
  : {
      host:     process.env.DB_HOST     || process.env.PGHOST     || 'localhost',
      port:     parseInt(process.env.DB_PORT || process.env.PGPORT || '5432', 10),
      user:     process.env.DB_USER     || process.env.PGUSER     || 'postgres',
      password: process.env.DB_PASSWORD || process.env.PGPASSWORD || '',
      database: process.env.DB_NAME     || process.env.PGDATABASE || 'hotel_menu',
      ssl:      isProductionOrCloud ? { rejectUnauthorized: false } : false,
    };

const pool = new Pool({
  ...poolConfig,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000, // 30s timeout for Neon cold-starts
});

// Resilient initialization with auto-retry for Neon cold starts
async function initDb(retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await pool.connect();
      console.log('✅  PostgreSQL connected to Neon successfully!');
      client.release();

      // 1. Create users table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id            SERIAL PRIMARY KEY,
          email         VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role          VARCHAR(50) DEFAULT 'admin',
          created_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 2. Create menu_items table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS menu_items (
          id          SERIAL PRIMARY KEY,
          name        VARCHAR(150) NOT NULL,
          category    VARCHAR(50) NOT NULL,
          description TEXT,
          price       NUMERIC(10,2) NOT NULL,
          image_path  TEXT DEFAULT NULL,
          available   BOOLEAN DEFAULT TRUE,
          created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 3. Create orders table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id                SERIAL PRIMARY KEY,
          table_number      INT NULL,
          customer_name     VARCHAR(255) NULL,
          customer_phone    VARCHAR(50) NULL,
          customer_location TEXT NULL,
          items             JSONB NOT NULL,
          total             NUMERIC(10,2) NOT NULL,
          status            VARCHAR(50) DEFAULT 'New',
          created_at        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 4. Create Indexes
      await pool.query('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(table_number)');

      // 5. Auto-verify & seed default admin user
      const bcrypt = require('bcryptjs');
      const adminEmail = 'admin@hotel.com';
      const adminHash = bcrypt.hashSync('admin123', 10);

      const userRes = await pool.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [adminEmail]);
      if (userRes.rows.length === 0) {
        await pool.query(
          'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)',
          [adminEmail, adminHash, 'admin']
        );
        console.log('💡  [DB-AutoFix] Default admin user created (admin@hotel.com / admin123).');
      }

      // 6. Seed initial menu items if menu is empty
      const menuCount = await pool.query('SELECT COUNT(*) FROM menu_items');
      if (parseInt(menuCount.rows[0].count, 10) === 0) {
        await pool.query(`
          INSERT INTO menu_items (name, category, description, price, available) VALUES
            ('Bruschetta',          'Starters',     'Toasted artisan bread rubbed with garlic, heirloom tomatoes, and basil.', 9.50, TRUE),
            ('Caesar Salad',        'Starters',     'Crisp romaine, creamy house dressing, aged Parmesan, brioche croutons.', 12.00, TRUE),
            ('Loaded Nachos',       'Starters',     'Stone-ground corn crisps, cheddar fondue, pickled jalapeño, guacamole.', 14.50, TRUE),
            ('Garlic Mushroom Soup','Starters',     'Velvety wild forest mushroom soup with truffle cream infusion.', 11.00, TRUE),
            ('Grilled Chicken',     'Main Course',  'Herb-marinated free-range chicken breast with garden vegetables.', 24.00, TRUE),
            ('Pasta Carbonara',     'Main Course',  'Artisan pasta with guanciale, egg yolk emulsion, and Pecorino Romano.', 22.50, TRUE),
            ('Margherita Pizza',    'Main Course',  'Neapolitan style with San Marzano tomato, fior di latte, fresh basil.', 19.00, TRUE),
            ('Prime Beef Burger',   'Main Course',  'Dry-aged beef patty, caramelized onions, Gruyère cheese, brioche bun.', 21.00, TRUE),
            ('Ribeye Steak',        'Grills',       '300g charcoal-grilled prime ribeye with chimichurri and roasted garlic.', 38.00, TRUE),
            ('BBQ Pork Ribs',       'Grills',       'Slow-smoked ribs with bourbon glaze, served with apple-cider slaw.', 32.00, TRUE),
            ('Lamb Chops',          'Grills',       'Rosemary and thyme crusted lamb cutlets with mint jus.', 36.00, TRUE),
            ('Grilled Tiger Prawns','Grills',       'Wild jumbo prawns with garlic-herb butter and charred lemon.', 34.00, TRUE),
            ('Chocolate Fondant',   'Desserts',     'Warm Valrhona chocolate cake with liquid center, Madagascar vanilla bean gelato.', 12.50, TRUE),
            ('Crème Brûlée',        'Desserts',     'Tahitian vanilla custard with crisp caramelized sugar crust.', 11.00, TRUE),
            ('Mango Sorbet',        'Desserts',     'Refreshing tropical mango sorbet with fresh mint.', 9.00, TRUE),
            ('Tiramisu Classico',   'Desserts',     'Savoiardi soaked in espresso, layered with mascarpone cream.', 11.50, TRUE),
            ('Fresh Mint Lemonade', 'Drinks',       'Hand-pressed lemons with fresh garden mint and raw honey.', 6.50, TRUE),
            ('Mango Cardamom Lassi','Drinks',       'Alphonso mango purée blended with Greek yoghurt and green cardamom.', 7.50, TRUE),
            ('San Pellegrino',      'Drinks',       'Chilled Italian sparkling mineral water – 750ml.', 6.00, TRUE),
            ('Double Espresso',     'Drinks',       'Single-origin Arabica double extraction.', 4.50, TRUE);
        `);
        console.log('💡  [DB-AutoFix] Initial culinary menu seeded.');
      }

      return; // Success!

    } catch (err) {
      console.warn(`⚠️  PostgreSQL connection attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt < retries) {
        console.log('⏳  Retrying in 2 seconds (Neon database waking up)...');
        await new Promise(res => setTimeout(res, 2000));
      } else {
        console.error('❌  PostgreSQL connection failed after all retries:', err.message);
      }
    }
  }
}

// Run initDb
initDb();

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  initDb,
};
