-- ============================================================
-- AI-Based Restaurant Ordering & Delivery Management System
-- PostgreSQL Schema
-- ============================================================

-- Drop existing types/tables (development reset)
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS restaurants CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS order_status CASCADE;

-- ============================================================
-- ENUM Types
-- ============================================================

CREATE TYPE user_role AS ENUM ('customer', 'rider', 'admin');

CREATE TYPE order_status AS ENUM (
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
  'cancelled'
);

-- ============================================================
-- Users (customers, riders, admins)
-- ============================================================

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          user_role NOT NULL DEFAULT 'customer',
  phone         VARCHAR(20),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Restaurants
-- ============================================================

CREATE TABLE restaurants (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  address     TEXT NOT NULL,
  phone       VARCHAR(20),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Menu Items
-- ============================================================

CREATE TABLE menu_items (
  id            SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  description   TEXT,
  price         DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  category      VARCHAR(100),
  is_available  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Inventory (real-time stock per menu item)
-- ============================================================

CREATE TABLE inventory (
  id                  SERIAL PRIMARY KEY,
  menu_item_id        INTEGER NOT NULL UNIQUE REFERENCES menu_items(id) ON DELETE CASCADE,
  restaurant_id       INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  quantity            INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 10 CHECK (low_stock_threshold >= 0),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Orders
-- ============================================================

CREATE TABLE orders (
  id               SERIAL PRIMARY KEY,
  customer_id      INTEGER NOT NULL REFERENCES users(id),
  restaurant_id    INTEGER NOT NULL REFERENCES restaurants(id),
  rider_id         INTEGER REFERENCES users(id),
  status           order_status NOT NULL DEFAULT 'pending',
  total_amount     DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
  delivery_address TEXT NOT NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Order Items
-- ============================================================

CREATE TABLE order_items (
  id           SERIAL PRIMARY KEY,
  order_id     INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  unit_price   DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
  subtotal     DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);

CREATE INDEX idx_restaurants_active ON restaurants(is_active);

CREATE INDEX idx_menu_items_restaurant ON menu_items(restaurant_id);
CREATE INDEX idx_menu_items_category ON menu_items(category);

CREATE INDEX idx_inventory_restaurant ON inventory(restaurant_id);
CREATE INDEX idx_inventory_menu_item ON inventory(menu_item_id);
CREATE INDEX idx_inventory_low_stock ON inventory(restaurant_id, quantity)
  WHERE quantity <= low_stock_threshold;

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX idx_orders_rider ON orders(rider_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_menu_item ON order_items(menu_item_id);
