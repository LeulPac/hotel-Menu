-- ============================================================
-- Hotel Restaurant QR Ordering System – PostgreSQL Schema (Neon / Supabase / Postgres)
-- ============================================================

-- Admin Users table
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(50) DEFAULT 'admin',
  created_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Default admin: admin@hotel.com / admin123
INSERT INTO users (email, password_hash, role)
VALUES ('admin@hotel.com', '$2b$10$w9h6TjiXcTeDHFVYLPoDzeRNqapnU4LE4geEGPk6D9sC.vsT/rjwm', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Menu Items table
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
);

-- Seed Initial Menu Items
INSERT INTO menu_items (name, category, description, price, available) VALUES
  ('Bruschetta',          'Starters',     'Toasted bread rubbed with garlic, topped with fresh tomatoes and basil.', 7.99, TRUE),
  ('Caesar Salad',        'Starters',     'Crisp romaine lettuce, creamy Caesar dressing, croutons, and Parmesan.', 9.99, TRUE),
  ('Loaded Nachos',       'Starters',     'Tortilla chips piled with cheese, jalapeños, sour cream, and salsa.',  11.99, TRUE),
  ('Garlic Mushroom Soup','Starters',     'Velvety soup with sautéed wild mushrooms and a hint of garlic cream.',  8.49, TRUE),

  ('Grilled Chicken',     'Main Course',  'Herb-marinated chicken breast with roasted vegetables and sauce.',       17.99, TRUE),
  ('Pasta Carbonara',     'Main Course',  'Classic Roman pasta with pancetta, eggs, Pecorino, and black pepper.',   15.99, TRUE),
  ('Margherita Pizza',    'Main Course',  'Stone-baked pizza with San Marzano tomato, mozzarella, and fresh basil.',16.99, TRUE),
  ('Beef Burger',         'Main Course',  'Juicy 200g beef patty, lettuce, tomato, pickles, and house sauce.',      14.99, TRUE),

  ('Ribeye Steak',        'Grills',       '300g ribeye, charcoal-grilled to perfection with chimichurri sauce.',    32.99, TRUE),
  ('BBQ Pork Ribs',       'Grills',       'Slow-cooked ribs glazed with smoky BBQ sauce, served with coleslaw.',    26.99, TRUE),
  ('Lamb Chops',          'Grills',       'Tender lamb chops marinated in rosemary and garlic, grilled rare.',      29.99, TRUE),
  ('Grilled Prawns',      'Grills',       'Tiger prawns in lemon-butter with garlic, grilled on a hot plate.',      24.99, TRUE),

  ('Chocolate Lava Cake', 'Desserts',     'Warm chocolate cake with a gooey molten centre, served with ice cream.',  8.99, TRUE),
  ('Crème Brûlée',        'Desserts',     'Classic French custard with a perfectly caramelised sugar top.',           7.99, TRUE),
  ('Mango Sorbet',        'Desserts',     'Refreshing tropical mango sorbet, three generous scoops.',                 6.49, TRUE),
  ('Tiramisu',            'Desserts',     'Espresso-soaked ladyfingers layered with mascarpone cream.',               8.49, TRUE),

  ('Fresh Lemonade',      'Drinks',       'Hand-squeezed lemonade with mint and a hint of honey.',                   4.49, TRUE),
  ('Mango Smoothie',      'Drinks',       'Fresh mango blended with yoghurt and a touch of cardamom.',               5.49, TRUE),
  ('Sparkling Water',     'Drinks',       'Still or sparkling mineral water – 500 ml chilled bottle.',               2.99, TRUE),
  ('Espresso',            'Drinks',       'Double-shot espresso made from freshly ground Arabica beans.',            3.49, TRUE)
ON CONFLICT DO NOTHING;

-- Orders table
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
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(table_number);
