-- ============================================================
-- Hotel Restaurant QR Ordering System – Database Schema
-- Run: mysql -u root -p < scripts/init-db.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS hotel_menu CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hotel_menu;

-- ─── Admin Users ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('admin') DEFAULT 'admin',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default admin: admin@hotel.com / admin123 (bcrypt hash below)
-- Replace hash with a real bcrypt hash in production!
INSERT IGNORE INTO users (email, password_hash, role) VALUES
  ('admin@hotel.com', '$2b$10$w9h6TjiXcTeDHFVYLPoDzeRNqapnU4LE4geEGPk6D9sC.vsT/rjwm', 'admin');

-- ─── Menu Items ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_items (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  category    ENUM('Starters','Main Course','Grills','Desserts','Drinks') NOT NULL,
  description TEXT,
  price       DECIMAL(10,2) NOT NULL,
  image_path  VARCHAR(255) DEFAULT NULL,
  available   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed menu items
INSERT IGNORE INTO menu_items (name, category, description, price, available) VALUES
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
  ('Espresso',            'Drinks',       'Double-shot espresso made from freshly ground Arabica beans.',            3.49, TRUE);

-- ─── Orders ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  table_number INT NOT NULL,
  items        JSON NOT NULL,        -- [{"itemId":1,"name":"Bruschetta","qty":2,"price":7.99}, ...]
  total        DECIMAL(10,2) NOT NULL,
  status       ENUM('New','Preparing','Ready','Delivered') DEFAULT 'New',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status     (status),
  INDEX idx_created_at (created_at),
  INDEX idx_table      (table_number)
);
