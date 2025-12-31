-- ===========================================
-- Chiyadani POS - Complete Database Schema
-- Version 2.0 - Optimized for high-volume restaurant operations
-- Includes: Inventory with unit-specific thresholds, portion pricing
-- Run this in Supabase SQL Editor
-- ===========================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- DROP EXISTING OBJECTS (Clean Slate)
-- ===========================================

-- Drop all functions first
DROP FUNCTION IF EXISTS get_low_stock_items CASCADE;
DROP FUNCTION IF EXISTS get_inventory_summary CASCADE;
DROP FUNCTION IF EXISTS get_item_portion_prices CASCADE;
DROP FUNCTION IF EXISTS deduct_inventory CASCADE;
DROP FUNCTION IF EXISTS get_unit_default_threshold CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_payment_blocks CASCADE;
DROP FUNCTION IF EXISTS override_payment_block CASCADE;
DROP FUNCTION IF EXISTS record_payment_block CASCADE;
DROP FUNCTION IF EXISTS check_payment_block CASCADE;

-- Drop type (CASCADE will drop dependent objects)
DROP TYPE IF EXISTS inventory_unit_type CASCADE;

-- Drop tables in dependency order
DROP TABLE IF EXISTS item_portion_prices CASCADE;
DROP TABLE IF EXISTS portion_options CASCADE;
DROP TABLE IF EXISTS inventory_transactions CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS inventory_categories CASCADE;
DROP TABLE IF EXISTS payment_blocks CASCADE;
DROP TABLE IF EXISTS waiter_calls CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS bills CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- ===========================================
-- CORE TABLES
-- ===========================================

-- Categories table (supports parent-child hierarchy for subcategories)
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  prep_time INTEGER DEFAULT 5,
  parent_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menu items table
CREATE TABLE menu_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  available BOOLEAN DEFAULT true,
  description TEXT DEFAULT '',
  image TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  table_number INTEGER NOT NULL,
  customer_phone TEXT DEFAULT '',
  items JSONB NOT NULL DEFAULT '[]',
  status TEXT DEFAULT 'pending',
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  -- Waiter order fields
  created_by TEXT DEFAULT NULL,
  is_waiter_order BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bills table
CREATE TABLE bills (
  id TEXT PRIMARY KEY,
  table_number INTEGER NOT NULL,
  orders JSONB NOT NULL DEFAULT '[]',
  customer_phones JSONB NOT NULL DEFAULT '[]',
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'unpaid',
  payment_method TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions table (completed sales)
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  bill_id TEXT,
  table_number INTEGER NOT NULL,
  customer_phones JSONB DEFAULT '[]',
  total DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  payment_method TEXT NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL,
  items JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers table
CREATE TABLE customers (
  phone TEXT PRIMARY KEY,
  name TEXT DEFAULT '',
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  points INTEGER DEFAULT 0,
  last_visit TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff table
CREATE TABLE staff (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  pin TEXT DEFAULT '',
  role TEXT DEFAULT 'counter',
  name TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings table (single row for app configuration)
CREATE TABLE settings (
  id SERIAL PRIMARY KEY,
  restaurant_name TEXT DEFAULT 'Chiyadani',
  restaurant_sub_name TEXT DEFAULT '',
  table_count INTEGER DEFAULT 10,
  wifi_ssid TEXT DEFAULT '',
  wifi_password TEXT DEFAULT '',
  base_url TEXT DEFAULT '',
  logo TEXT DEFAULT '',
  instagram_url TEXT DEFAULT '',
  facebook_url TEXT DEFAULT '',
  tiktok_url TEXT DEFAULT '',
  google_review_url TEXT DEFAULT '',
  counter_as_admin BOOLEAN DEFAULT false,
  -- Counter settings
  counter_kitchen_access BOOLEAN DEFAULT false,
  counter_kot_enabled BOOLEAN DEFAULT false,
  kitchen_handles INTEGER DEFAULT 3,
  point_system_enabled BOOLEAN DEFAULT false,
  points_per_rupee DECIMAL DEFAULT 0.1,
  point_value_in_rupees DECIMAL DEFAULT 1,
  max_discount_rupees DECIMAL DEFAULT 500,
  max_discount_points INTEGER DEFAULT 500,
  -- Kitchen settings
  kds_enabled BOOLEAN DEFAULT false,
  kot_printing_enabled BOOLEAN DEFAULT false,
  kitchen_fullscreen_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses table
CREATE TABLE expenses (
  id TEXT PRIMARY KEY,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL,
  created_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Waiter calls table
CREATE TABLE waiter_calls (
  id TEXT PRIMARY KEY,
  table_number INTEGER NOT NULL,
  customer_phone TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment blocks table (3-hour cooldown after payment)
CREATE TABLE payment_blocks (
  id SERIAL PRIMARY KEY,
  table_number INTEGER NOT NULL,
  customer_phone TEXT NOT NULL,
  paid_at TIMESTAMPTZ DEFAULT NOW(),
  staff_override BOOLEAN DEFAULT FALSE,
  override_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- INVENTORY SYSTEM
-- ===========================================

-- Inventory unit type enum
CREATE TYPE inventory_unit_type AS ENUM ('ml', 'pcs', 'grams', 'bottle', 'pack');

-- Inventory categories (categories that are tracked in inventory)
CREATE TABLE inventory_categories (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  unit_type inventory_unit_type NOT NULL DEFAULT 'pcs',
  -- For ml-based items: default bottle/container size
  default_container_size DECIMAL(10,2) DEFAULT NULL,
  -- Low stock warning threshold (unit-specific defaults applied via function)
  low_stock_threshold DECIMAL(10,2) DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory items (stock for menu items)
CREATE TABLE inventory_items (
  id TEXT PRIMARY KEY,
  menu_item_id TEXT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  -- Current stock level (in base units: ml, pcs, grams)
  current_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
  -- Container size for this item (inherits from category or custom)
  container_size DECIMAL(10,2) DEFAULT NULL,
  -- Unit for display
  unit inventory_unit_type NOT NULL DEFAULT 'pcs',
  -- Low stock warning threshold (unit-specific, overrides category)
  low_stock_threshold DECIMAL(10,2) DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(menu_item_id)
);

-- Inventory transactions (log of stock changes)
CREATE TABLE inventory_transactions (
  id TEXT PRIMARY KEY,
  inventory_item_id TEXT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  -- Transaction type: 'receive' for adding stock, 'sale' for deducting
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('receive', 'sale', 'adjustment', 'waste')),
  -- Quantity changed (positive for receive, negative for sale)
  quantity DECIMAL(10,2) NOT NULL,
  -- Unit used in transaction
  unit inventory_unit_type NOT NULL,
  -- Reference to order (for sales)
  order_id TEXT DEFAULT NULL,
  -- Notes
  notes TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portion options for categories (fixed portions per category)
CREATE TABLE portion_options (
  id TEXT PRIMARY KEY,
  inventory_category_id TEXT NOT NULL REFERENCES inventory_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  -- Size in base units (ml, pcs, etc.)
  size DECIMAL(10,2) NOT NULL,
  -- Price multiplier (legacy, use fixed_price instead)
  price_multiplier DECIMAL(5,2) NOT NULL DEFAULT 1.0,
  -- Fixed price for this portion (default if no item-specific price)
  fixed_price DECIMAL(10,2) DEFAULT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Item-specific portion prices (overrides category-level portion prices)
CREATE TABLE item_portion_prices (
  id TEXT PRIMARY KEY,
  menu_item_id TEXT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  portion_option_id TEXT NOT NULL REFERENCES portion_options(id) ON DELETE CASCADE,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(menu_item_id, portion_option_id)
);

-- ===========================================
-- INDEXES for Performance
-- ===========================================

-- Core tables
CREATE INDEX idx_categories_sort ON categories(sort_order);
CREATE INDEX idx_categories_parent ON categories(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_menu_items_category ON menu_items(category);
CREATE INDEX idx_menu_items_available ON menu_items(available) WHERE available = true;
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_status_pending ON orders(status) WHERE status IN ('pending', 'preparing');
CREATE INDEX idx_orders_table ON orders(table_number);
CREATE INDEX idx_orders_phone ON orders(customer_phone) WHERE customer_phone != '';
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_waiter ON orders(is_waiter_order, created_by) WHERE is_waiter_order = true;
CREATE INDEX idx_bills_status ON bills(status);
CREATE INDEX idx_bills_status_unpaid ON bills(status) WHERE status = 'unpaid';
CREATE INDEX idx_bills_table ON bills(table_number);
CREATE INDEX idx_bills_paid ON bills(paid_at DESC) WHERE paid_at IS NOT NULL;
CREATE INDEX idx_transactions_paid ON transactions(paid_at DESC);
CREATE INDEX idx_transactions_table ON transactions(table_number);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_last_visit ON customers(last_visit DESC);
CREATE INDEX idx_customers_points ON customers(points) WHERE points > 0;
CREATE INDEX idx_staff_username ON staff(username);
CREATE INDEX idx_staff_role ON staff(role);
CREATE INDEX idx_expenses_created ON expenses(created_at DESC);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_waiter_calls_status ON waiter_calls(status);
CREATE INDEX idx_waiter_calls_status_pending ON waiter_calls(status) WHERE status = 'pending';
CREATE INDEX idx_waiter_calls_table ON waiter_calls(table_number);
CREATE INDEX idx_payment_blocks_lookup ON payment_blocks(table_number, customer_phone, paid_at DESC);
CREATE INDEX idx_payment_blocks_active ON payment_blocks(paid_at) WHERE staff_override = false;

-- Inventory tables
CREATE INDEX idx_inventory_categories_category ON inventory_categories(category_id);
CREATE INDEX idx_inventory_items_menu_item ON inventory_items(menu_item_id);
CREATE INDEX idx_inventory_items_stock ON inventory_items(current_stock);
CREATE INDEX idx_inventory_items_low_stock ON inventory_items(current_stock, low_stock_threshold);
CREATE INDEX idx_inventory_items_unit ON inventory_items(unit);
CREATE INDEX idx_inventory_transactions_item ON inventory_transactions(inventory_item_id);
CREATE INDEX idx_inventory_transactions_type ON inventory_transactions(transaction_type);
CREATE INDEX idx_inventory_transactions_created ON inventory_transactions(created_at DESC);
CREATE INDEX idx_inventory_transactions_order ON inventory_transactions(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX idx_portion_options_category ON portion_options(inventory_category_id);
CREATE INDEX idx_portion_options_sort ON portion_options(inventory_category_id, sort_order);
CREATE INDEX idx_item_portion_prices_menu_item ON item_portion_prices(menu_item_id);
CREATE INDEX idx_item_portion_prices_portion ON item_portion_prices(portion_option_id);
CREATE INDEX idx_item_portion_prices_lookup ON item_portion_prices(menu_item_id, portion_option_id);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiter_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE portion_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_portion_prices ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- RLS POLICIES
-- ===========================================

-- Categories
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public insert categories" ON categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update categories" ON categories FOR UPDATE USING (true);
CREATE POLICY "Public delete categories" ON categories FOR DELETE USING (true);

-- Menu Items
CREATE POLICY "Public read menu_items" ON menu_items FOR SELECT USING (true);
CREATE POLICY "Public insert menu_items" ON menu_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update menu_items" ON menu_items FOR UPDATE USING (true);
CREATE POLICY "Public delete menu_items" ON menu_items FOR DELETE USING (true);

-- Orders
CREATE POLICY "Public read orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Public insert orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update orders" ON orders FOR UPDATE USING (true);
CREATE POLICY "Public delete orders" ON orders FOR DELETE USING (true);

-- Bills
CREATE POLICY "Public read bills" ON bills FOR SELECT USING (true);
CREATE POLICY "Public insert bills" ON bills FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update bills" ON bills FOR UPDATE USING (true);
CREATE POLICY "Public delete bills" ON bills FOR DELETE USING (true);

-- Transactions
CREATE POLICY "Public read transactions" ON transactions FOR SELECT USING (true);
CREATE POLICY "Public insert transactions" ON transactions FOR INSERT WITH CHECK (true);

-- Customers
CREATE POLICY "Public read customers" ON customers FOR SELECT USING (true);
CREATE POLICY "Public insert customers" ON customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update customers" ON customers FOR UPDATE USING (true);
CREATE POLICY "Public delete customers" ON customers FOR DELETE USING (true);

-- Staff
CREATE POLICY "Public read staff" ON staff FOR SELECT USING (true);
CREATE POLICY "Public insert staff" ON staff FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update staff" ON staff FOR UPDATE USING (true);
CREATE POLICY "Public delete staff" ON staff FOR DELETE USING (true);

-- Settings
CREATE POLICY "Public read settings" ON settings FOR SELECT USING (true);
CREATE POLICY "Public insert settings" ON settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update settings" ON settings FOR UPDATE USING (true);

-- Expenses
CREATE POLICY "Public read expenses" ON expenses FOR SELECT USING (true);
CREATE POLICY "Public insert expenses" ON expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete expenses" ON expenses FOR DELETE USING (true);

-- Waiter Calls
CREATE POLICY "Public read waiter_calls" ON waiter_calls FOR SELECT USING (true);
CREATE POLICY "Public insert waiter_calls" ON waiter_calls FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update waiter_calls" ON waiter_calls FOR UPDATE USING (true);
CREATE POLICY "Public delete waiter_calls" ON waiter_calls FOR DELETE USING (true);

-- Payment Blocks
CREATE POLICY "Public read payment_blocks" ON payment_blocks FOR SELECT USING (true);
CREATE POLICY "Public insert payment_blocks" ON payment_blocks FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update payment_blocks" ON payment_blocks FOR UPDATE USING (true);

-- Inventory Categories
CREATE POLICY "Public read inventory_categories" ON inventory_categories FOR SELECT USING (true);
CREATE POLICY "Public insert inventory_categories" ON inventory_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update inventory_categories" ON inventory_categories FOR UPDATE USING (true);
CREATE POLICY "Public delete inventory_categories" ON inventory_categories FOR DELETE USING (true);

-- Inventory Items
CREATE POLICY "Public read inventory_items" ON inventory_items FOR SELECT USING (true);
CREATE POLICY "Public insert inventory_items" ON inventory_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update inventory_items" ON inventory_items FOR UPDATE USING (true);
CREATE POLICY "Public delete inventory_items" ON inventory_items FOR DELETE USING (true);

-- Inventory Transactions
CREATE POLICY "Public read inventory_transactions" ON inventory_transactions FOR SELECT USING (true);
CREATE POLICY "Public insert inventory_transactions" ON inventory_transactions FOR INSERT WITH CHECK (true);

-- Portion Options
CREATE POLICY "Public read portion_options" ON portion_options FOR SELECT USING (true);
CREATE POLICY "Public insert portion_options" ON portion_options FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update portion_options" ON portion_options FOR UPDATE USING (true);
CREATE POLICY "Public delete portion_options" ON portion_options FOR DELETE USING (true);

-- Item Portion Prices
CREATE POLICY "Public read item_portion_prices" ON item_portion_prices FOR SELECT USING (true);
CREATE POLICY "Public insert item_portion_prices" ON item_portion_prices FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update item_portion_prices" ON item_portion_prices FOR UPDATE USING (true);
CREATE POLICY "Public delete item_portion_prices" ON item_portion_prices FOR DELETE USING (true);

-- ===========================================
-- REALTIME SUBSCRIPTIONS
-- ===========================================

DO $$
BEGIN
  -- Orders realtime
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  END IF;
  
  -- Waiter calls realtime
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'waiter_calls'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE waiter_calls;
  END IF;
  
  -- Bills realtime
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'bills'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE bills;
  END IF;
  
  -- Inventory items realtime
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'inventory_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE inventory_items;
  END IF;
  
  -- Menu items realtime (for availability updates)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'menu_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE menu_items;
  END IF;
END $$;

-- ===========================================
-- HELPER FUNCTIONS
-- ===========================================

-- Function to get default threshold by unit type
CREATE OR REPLACE FUNCTION get_unit_default_threshold(p_unit inventory_unit_type)
RETURNS DECIMAL AS $$
BEGIN
  RETURN CASE p_unit
    WHEN 'ml' THEN 500      -- 500ml
    WHEN 'pcs' THEN 10      -- 10 pieces
    WHEN 'grams' THEN 500   -- 500 grams
    WHEN 'bottle' THEN 5    -- 5 bottles
    WHEN 'pack' THEN 3      -- 3 packs
    ELSE 10
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if customer is blocked (paid within 3 hours)
CREATE OR REPLACE FUNCTION check_payment_block(
  p_table_number INTEGER,
  p_customer_phone TEXT
)
RETURNS TABLE (
  is_blocked BOOLEAN,
  paid_at TIMESTAMPTZ,
  block_id INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE WHEN pb.id IS NOT NULL AND pb.staff_override = FALSE THEN TRUE ELSE FALSE END,
    pb.paid_at,
    pb.id
  FROM payment_blocks pb
  WHERE pb.table_number = p_table_number
    AND pb.customer_phone = p_customer_phone
    AND pb.paid_at > NOW() - INTERVAL '3 hours'
    AND pb.staff_override = FALSE
  ORDER BY pb.paid_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record a payment block
CREATE OR REPLACE FUNCTION record_payment_block(
  p_table_number INTEGER,
  p_customer_phone TEXT
)
RETURNS INTEGER AS $$
DECLARE
  new_id INTEGER;
BEGIN
  INSERT INTO payment_blocks (table_number, customer_phone, paid_at)
  VALUES (p_table_number, p_customer_phone, NOW())
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to override a payment block (staff confirmation)
CREATE OR REPLACE FUNCTION override_payment_block(p_block_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE payment_blocks SET staff_override = TRUE, override_at = NOW() WHERE id = p_block_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old payment blocks (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_payment_blocks()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM payment_blocks WHERE paid_at < NOW() - INTERVAL '24 hours';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- INVENTORY FUNCTIONS
-- ===========================================

-- Function to deduct inventory on order acceptance
CREATE OR REPLACE FUNCTION deduct_inventory(
  p_menu_item_id TEXT,
  p_quantity DECIMAL,
  p_unit inventory_unit_type,
  p_order_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  inv_item RECORD;
  deduct_amount DECIMAL;
BEGIN
  -- Get inventory item
  SELECT * INTO inv_item FROM inventory_items WHERE menu_item_id = p_menu_item_id;
  
  IF inv_item IS NULL THEN
    -- Item not tracked in inventory, return success
    RETURN TRUE;
  END IF;
  
  -- Calculate deduction amount based on unit conversion
  deduct_amount := p_quantity;
  
  -- Update stock
  UPDATE inventory_items 
  SET current_stock = current_stock - deduct_amount,
      updated_at = NOW()
  WHERE id = inv_item.id;
  
  -- Log transaction
  INSERT INTO inventory_transactions (id, inventory_item_id, transaction_type, quantity, unit, order_id)
  VALUES (gen_random_uuid()::text, inv_item.id, 'sale', -deduct_amount, p_unit, p_order_id);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get low stock items with unit-specific thresholds
CREATE OR REPLACE FUNCTION get_low_stock_items()
RETURNS TABLE (
  inventory_item_id TEXT,
  menu_item_name TEXT,
  current_stock DECIMAL,
  threshold DECIMAL,
  unit inventory_unit_type,
  stock_percentage DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ii.id,
    mi.name,
    ii.current_stock,
    COALESCE(
      ii.low_stock_threshold, 
      ic.low_stock_threshold, 
      get_unit_default_threshold(ii.unit)
    ) as threshold,
    ii.unit,
    CASE 
      WHEN COALESCE(ii.low_stock_threshold, ic.low_stock_threshold, get_unit_default_threshold(ii.unit)) > 0 
      THEN ROUND((ii.current_stock / COALESCE(ii.low_stock_threshold, ic.low_stock_threshold, get_unit_default_threshold(ii.unit))) * 100, 1)
      ELSE 100
    END as stock_percentage
  FROM inventory_items ii
  JOIN menu_items mi ON ii.menu_item_id = mi.id
  LEFT JOIN inventory_categories ic ON mi.category = (SELECT c.name FROM categories c WHERE c.id = ic.category_id)
  WHERE ii.current_stock <= COALESCE(ii.low_stock_threshold, ic.low_stock_threshold, get_unit_default_threshold(ii.unit))
  ORDER BY 
    CASE 
      WHEN ii.current_stock <= 0 THEN 0
      WHEN ii.current_stock <= COALESCE(ii.low_stock_threshold, ic.low_stock_threshold, get_unit_default_threshold(ii.unit)) * 0.25 THEN 1
      ELSE 2
    END,
    ii.current_stock ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get inventory summary by status
CREATE OR REPLACE FUNCTION get_inventory_summary()
RETURNS TABLE (
  total_items BIGINT,
  out_of_stock BIGINT,
  critical_stock BIGINT,
  low_stock BIGINT,
  healthy_stock BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_items,
    COUNT(*) FILTER (WHERE ii.current_stock <= 0)::BIGINT as out_of_stock,
    COUNT(*) FILTER (
      WHERE ii.current_stock > 0 
      AND ii.current_stock <= COALESCE(ii.low_stock_threshold, get_unit_default_threshold(ii.unit)) * 0.25
    )::BIGINT as critical_stock,
    COUNT(*) FILTER (
      WHERE ii.current_stock > COALESCE(ii.low_stock_threshold, get_unit_default_threshold(ii.unit)) * 0.25
      AND ii.current_stock <= COALESCE(ii.low_stock_threshold, get_unit_default_threshold(ii.unit))
    )::BIGINT as low_stock,
    COUNT(*) FILTER (
      WHERE ii.current_stock > COALESCE(ii.low_stock_threshold, get_unit_default_threshold(ii.unit))
    )::BIGINT as healthy_stock
  FROM inventory_items ii;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get item portion prices with fallback to category defaults
CREATE OR REPLACE FUNCTION get_item_portion_prices(p_menu_item_id TEXT)
RETURNS TABLE (
  portion_id TEXT,
  portion_name TEXT,
  portion_size DECIMAL,
  price DECIMAL,
  is_item_specific BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    po.id,
    po.name,
    po.size,
    COALESCE(ipp.price, po.fixed_price, 0) as price,
    ipp.id IS NOT NULL as is_item_specific
  FROM menu_items mi
  JOIN inventory_items ii ON ii.menu_item_id = mi.id
  JOIN inventory_categories ic ON mi.category = (SELECT c.name FROM categories c WHERE c.id = ic.category_id)
  JOIN portion_options po ON po.inventory_category_id = ic.id
  LEFT JOIN item_portion_prices ipp ON ipp.menu_item_id = mi.id AND ipp.portion_option_id = po.id
  WHERE mi.id = p_menu_item_id
  ORDER BY po.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- DEFAULT DATA
-- ===========================================

-- Insert default settings if not exists
INSERT INTO settings (restaurant_name, table_count)
VALUES ('Chiyadani', 10)
ON CONFLICT DO NOTHING;

-- ===========================================
-- MAINTENANCE NOTES
-- ===========================================
-- 
-- Default low stock thresholds by unit type:
-- - ml: 500 (500ml)
-- - pcs: 10 (10 pieces)
-- - grams: 500 (500 grams)
-- - bottle: 5 (5 bottles)
-- - pack: 3 (3 packs)
--
-- Run cleanup_old_payment_blocks() periodically to remove old records
-- Consider adding a cron job for automatic cleanup
--
-- Indexes are optimized for:
-- - High-frequency reads on active orders/bills
-- - Date-based reporting queries
-- - Inventory stock level checks
-- - Customer loyalty point lookups
-- ===========================================
