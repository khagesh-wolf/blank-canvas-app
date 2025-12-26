# Sajilo Orders POS - Complete Technical Setup Guide

**Version:** 1.0  
**Last Updated:** 2025-12-26  
**Purpose:** Step-by-step setup instructions for deploying a new restaurant instance

---

## Table of Contents

1. [Prerequisites & Accounts](#1-prerequisites--accounts)
2. [Supabase Database Setup](#2-supabase-database-setup)
3. [Cloudflare R2 Image Storage Setup](#3-cloudflare-r2-image-storage-setup)
4. [Cloudflare Worker Deployment](#4-cloudflare-worker-deployment)
5. [Cloudflare Pages Deployment](#5-cloudflare-pages-deployment)
6. [Environment Variables Reference](#6-environment-variables-reference)
7. [Initial Configuration](#7-initial-configuration)
8. [QR Code Generation](#8-qr-code-generation)
9. [Custom Domain Setup](#9-custom-domain-setup)
10. [PWA Installation](#10-pwa-installation)
11. [Thermal Printer Setup](#11-thermal-printer-setup)
12. [Database Maintenance](#12-database-maintenance)
13. [Troubleshooting Guide](#13-troubleshooting-guide)
14. [Security Checklist](#14-security-checklist)
15. [Backup & Recovery](#15-backup--recovery)

---

## 1. Prerequisites & Accounts

### Required Accounts (All Free Tier)

| Service | URL | Purpose |
|---------|-----|---------|
| GitHub | [github.com](https://github.com) | Code repository |
| Supabase | [supabase.com](https://supabase.com) | Database + Realtime |
| Cloudflare | [cloudflare.com](https://cloudflare.com) | Hosting + R2 + Workers |

### Required Tools (for CLI deployment)

```bash
# Node.js (v18+)
node --version

# npm
npm --version

# Git
git --version

# Wrangler (Cloudflare CLI) - Optional
npm install -g wrangler
```

### Free Tier Limits

| Service | Limit | Sufficient For |
|---------|-------|----------------|
| Supabase | 500MB database, unlimited API calls | 50,000+ orders/month |
| Cloudflare R2 | 10GB storage, 10M requests/month | 100,000+ images |
| Cloudflare Pages | Unlimited bandwidth | Unlimited visitors |
| Cloudflare Workers | 100K requests/day | Unlimited uploads |

---

## 2. Supabase Database Setup

### Step 2.1: Create New Project

1. Go to [supabase.com](https://supabase.com) → Sign In/Sign Up
2. Click **"New Project"** in your organization
3. Fill in the details:

| Field | Value | Example |
|-------|-------|---------|
| Name | Restaurant identifier | `sajilo-orders-kathmandu` |
| Database Password | Strong password (SAVE THIS!) | `YourSecure@Password123` |
| Region | **South Asia (Mumbai)** | Closest to Nepal |
| Pricing Plan | Free | $0/month |

4. Click **"Create new project"**
5. Wait 2-3 minutes for provisioning

### Step 2.2: Run Database Schema

1. In Supabase Dashboard → **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Copy the ENTIRE content from `supabase/schema.sql`:

```sql
-- ===========================================
-- Sajilo Orders POS - Complete Database Schema
-- ===========================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- DROP EXISTING TABLES (Clean Slate)
-- ===========================================

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
-- TABLES
-- ===========================================

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  prep_time INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menu items table
CREATE TABLE IF NOT EXISTS menu_items (
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
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  table_number INTEGER NOT NULL,
  customer_phone TEXT DEFAULT '',
  items JSONB NOT NULL DEFAULT '[]',
  status TEXT DEFAULT 'pending',
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bills table
CREATE TABLE IF NOT EXISTS bills (
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
CREATE TABLE IF NOT EXISTS transactions (
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
CREATE TABLE IF NOT EXISTS customers (
  phone TEXT PRIMARY KEY,
  name TEXT DEFAULT '',
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  points INTEGER DEFAULT 0,
  last_visit TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff table
CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  pin TEXT DEFAULT '',
  role TEXT DEFAULT 'counter',
  name TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings table (single row)
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  restaurant_name TEXT DEFAULT 'Restaurant',
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
  kitchen_handles INTEGER DEFAULT 3,
  point_system_enabled BOOLEAN DEFAULT false,
  points_per_rupee DECIMAL DEFAULT 0.1,
  point_value_in_rupees DECIMAL DEFAULT 1,
  max_discount_rupees DECIMAL DEFAULT 500,
  max_discount_points INTEGER DEFAULT 500,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL,
  created_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Waiter calls table
CREATE TABLE IF NOT EXISTS waiter_calls (
  id TEXT PRIMARY KEY,
  table_number INTEGER NOT NULL,
  customer_phone TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment blocks table (3-hour cooldown)
CREATE TABLE IF NOT EXISTS payment_blocks (
  id SERIAL PRIMARY KEY,
  table_number INTEGER NOT NULL,
  customer_phone TEXT NOT NULL,
  paid_at TIMESTAMPTZ DEFAULT NOW(),
  staff_override BOOLEAN DEFAULT FALSE,
  override_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

4. Click **"Run"** button
5. Should see: **"Success. No rows returned"**

### Step 2.3: Create Indexes (Performance)

Run this query after the schema:

```sql
-- ===========================================
-- INDEXES for Performance
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(available);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(table_number);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_table ON bills(table_number);
CREATE INDEX IF NOT EXISTS idx_bills_paid ON bills(paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_paid ON transactions(paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_table ON transactions(table_number);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_last_visit ON customers(last_visit DESC);
CREATE INDEX IF NOT EXISTS idx_staff_username ON staff(username);
CREATE INDEX IF NOT EXISTS idx_expenses_created ON expenses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_waiter_calls_status ON waiter_calls(status);
CREATE INDEX IF NOT EXISTS idx_waiter_calls_table ON waiter_calls(table_number);
CREATE INDEX IF NOT EXISTS idx_payment_blocks_lookup ON payment_blocks(table_number, customer_phone, paid_at DESC);
```

### Step 2.4: Enable Row Level Security (RLS)

```sql
-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

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

-- Public read/write policies for all tables
-- (In production, you might want to restrict these based on authentication)

-- Categories
CREATE POLICY "Public access categories" ON categories FOR ALL USING (true) WITH CHECK (true);

-- Menu Items
CREATE POLICY "Public access menu_items" ON menu_items FOR ALL USING (true) WITH CHECK (true);

-- Orders
CREATE POLICY "Public access orders" ON orders FOR ALL USING (true) WITH CHECK (true);

-- Bills
CREATE POLICY "Public access bills" ON bills FOR ALL USING (true) WITH CHECK (true);

-- Transactions
CREATE POLICY "Public access transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);

-- Customers
CREATE POLICY "Public access customers" ON customers FOR ALL USING (true) WITH CHECK (true);

-- Staff
CREATE POLICY "Public access staff" ON staff FOR ALL USING (true) WITH CHECK (true);

-- Settings
CREATE POLICY "Public access settings" ON settings FOR ALL USING (true) WITH CHECK (true);

-- Expenses
CREATE POLICY "Public access expenses" ON expenses FOR ALL USING (true) WITH CHECK (true);

-- Waiter Calls
CREATE POLICY "Public access waiter_calls" ON waiter_calls FOR ALL USING (true) WITH CHECK (true);

-- Payment Blocks
CREATE POLICY "Public access payment_blocks" ON payment_blocks FOR ALL USING (true) WITH CHECK (true);
```

### Step 2.5: Enable Realtime

```sql
-- ===========================================
-- REALTIME SUBSCRIPTIONS
-- ===========================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'waiter_calls'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE waiter_calls;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'bills'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE bills;
  END IF;
END $$;
```

### Step 2.6: Create Helper Functions

```sql
-- ===========================================
-- HELPER FUNCTIONS
-- ===========================================

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

-- Function to cleanup old payment blocks
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
```

### Step 2.7: Insert Default Data

```sql
-- ===========================================
-- DEFAULT DATA
-- ===========================================

-- Insert default admin user
INSERT INTO staff (id, username, password, role, name)
VALUES ('admin-001', 'admin', 'admin123', 'admin', 'Administrator')
ON CONFLICT (username) DO NOTHING;

-- Insert default settings
INSERT INTO settings (restaurant_name, table_count)
VALUES ('My Restaurant', 10)
ON CONFLICT DO NOTHING;
```

### Step 2.8: Get API Credentials

1. Go to **Settings** → **API** in Supabase Dashboard
2. Copy and save these values:

| Key | Location | Example |
|-----|----------|---------|
| **Project URL** | Under "Project URL" | `https://abcdefgh.supabase.co` |
| **anon/public key** | Under "Project API keys" | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` |

**⚠️ IMPORTANT:** Never share or commit your API keys to public repositories!

---

## 3. Cloudflare R2 Image Storage Setup

### Step 3.1: Create R2 Bucket

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Sign In/Sign Up with your email
3. Click **"R2"** in the left sidebar
4. Click **"Create bucket"**
5. Configure:

| Field | Value |
|-------|-------|
| Bucket name | `sajilo-orders-[restaurant-name]` |
| Location | Auto (or Asia Pacific if available) |

6. Click **"Create bucket"**

### Step 3.2: Enable Public Access

1. Click on your bucket name
2. Go to **"Settings"** tab
3. Under **"Public access"** section:
   - Click **"Allow Access"**
   - Confirm the action
4. Copy the **Public Bucket URL**:
   - Format: `https://pub-[random].r2.dev`
   - Example: `https://pub-9702a470ba4640419140bd808ef0b16a.r2.dev`

### Step 3.3: Note Your Account ID

1. Go to Cloudflare Dashboard home
2. Look at URL or **"Account ID"** in Overview
3. Format: `a0ddd36fdd76bdcb23b35158b13cd12d`

---

## 4. Cloudflare Worker Deployment

### Option A: Dashboard Deployment (Recommended for beginners)

#### Step 4.1: Create Worker

1. In Cloudflare Dashboard → **"Workers & Pages"**
2. Click **"Create application"** → **"Create Worker"**
3. Name: `sajilo-orders-api`
4. Click **"Deploy"** (deploys default "Hello World" code)

#### Step 4.2: Edit Worker Code

1. Click **"Edit code"** (or **"Quick edit"**)
2. Delete all existing code
3. Paste the following code:

```javascript
/**
 * Cloudflare Worker for R2 Image Upload
 * Sajilo Orders POS
 */

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    try {
      // Health check
      if (request.method === 'GET' && url.pathname === '/api/health') {
        return new Response(
          JSON.stringify({ status: 'ok', service: 'sajilo-orders-api' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Upload image
      if (request.method === 'POST' && url.pathname === '/api/upload') {
        const formData = await request.formData();
        const file = formData.get('file');
        let filename = formData.get('filename');

        if (!file) {
          return new Response(
            JSON.stringify({ error: 'No file provided' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        // Generate unique filename if not provided
        if (!filename) {
          const ext = file.name?.split('.').pop() || 'webp';
          filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        }

        // Determine content type
        let contentType = file.type || 'image/webp';
        if (filename.endsWith('.webp')) contentType = 'image/webp';
        else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) contentType = 'image/jpeg';
        else if (filename.endsWith('.png')) contentType = 'image/png';
        else if (filename.endsWith('.gif')) contentType = 'image/gif';

        // Upload to R2
        await env.R2_BUCKET.put(filename, file, {
          httpMetadata: {
            contentType,
            cacheControl: 'public, max-age=31536000, immutable',
          },
        });

        const publicUrl = `${env.R2_PUBLIC_URL}/${filename}`;

        return new Response(
          JSON.stringify({
            success: true,
            url: publicUrl,
            key: filename,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Delete image
      if (request.method === 'DELETE' && url.pathname === '/api/upload') {
        const key = url.searchParams.get('key');
        
        if (!key) {
          return new Response(
            JSON.stringify({ error: 'No key provided' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        await env.R2_BUCKET.delete(key);

        return new Response(
          JSON.stringify({ success: true, deleted: key }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // List images
      if (request.method === 'GET' && url.pathname === '/api/images') {
        const listed = await env.R2_BUCKET.list({ limit: 100 });
        const images = listed.objects.map(obj => ({
          key: obj.key,
          size: obj.size,
          uploaded: obj.uploaded,
          url: `${env.R2_PUBLIC_URL}/${obj.key}`,
        }));

        return new Response(
          JSON.stringify({ images }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // 404 for unknown routes
      return new Response(
        JSON.stringify({ error: 'Not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );

    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  },
};
```

5. Click **"Save and deploy"**

#### Step 4.3: Configure Bindings

1. Go to **Settings** → **Variables**
2. Add **Environment Variable**:

| Variable Name | Value |
|---------------|-------|
| `R2_PUBLIC_URL` | `https://pub-[your-id].r2.dev` |

3. Add **R2 Bucket Binding**:

| Variable Name | R2 Bucket |
|---------------|-----------|
| `R2_BUCKET` | `sajilo-orders-[restaurant-name]` |

4. Click **"Save"**

#### Step 4.4: Note Worker URL

Your worker URL will be:
```
https://sajilo-orders-api.[your-subdomain].workers.dev
```

### Option B: Wrangler CLI Deployment

1. Create `wrangler.toml` in `workers/` folder:

```toml
name = "sajilo-orders-api"
main = "image-upload.js"
compatibility_date = "2024-01-01"
account_id = "YOUR_CLOUDFLARE_ACCOUNT_ID"

[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "sajilo-orders-[restaurant-name]"

[vars]
R2_PUBLIC_URL = "https://pub-[your-id].r2.dev"
```

2. Deploy:

```bash
cd workers
wrangler login
wrangler deploy
```

---

## 5. Cloudflare Pages Deployment

### Step 5.1: Prepare Repository

1. Create a new GitHub repository:
   - Go to [github.com/new](https://github.com/new)
   - Name: `sajilo-orders-pos`
   - Visibility: Private (recommended)
   - Click **"Create repository"**

2. Clone and push your code:

```bash
# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Sajilo Orders POS"

# Add remote
git remote add origin https://github.com/YOUR_USERNAME/sajilo-orders-pos.git

# Push
git push -u origin main
```

### Step 5.2: Connect to Cloudflare Pages

1. Go to Cloudflare Dashboard → **"Workers & Pages"**
2. Click **"Create application"** → **"Pages"**
3. Click **"Connect to Git"**
4. Authorize GitHub if prompted
5. Select your repository: `sajilo-orders-pos`
6. Configure build settings:

| Setting | Value |
|---------|-------|
| Production branch | `main` |
| Framework preset | **Vite** |
| Build command | `npm run build` |
| Build output directory | `dist` |

### Step 5.3: Add Environment Variables

Click **"Add variable"** and add each:

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://[your-project].supabase.co` | Production |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1N...` | Production |
| `VITE_R2_PUBLIC_URL` | `https://pub-[id].r2.dev` | Production |
| `VITE_API_URL` | `https://sajilo-orders-api.[subdomain].workers.dev` | Production |

### Step 5.4: Deploy

1. Click **"Save and Deploy"**
2. Wait 2-5 minutes for build
3. Your app will be live at: `https://sajilo-orders-pos.pages.dev`

### Step 5.5: Update R2 Client (Important!)

After deployment, update the `src/lib/r2Client.ts` file with your worker URL:

```typescript
const WORKER_URL = 'https://sajilo-orders-api.[your-subdomain].workers.dev';
```

Then commit and push to trigger a rebuild.

---

## 6. Environment Variables Reference

### Complete List

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://abc.supabase.co` | ✅ Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key | `eyJhbG...` | ✅ Yes |
| `VITE_R2_PUBLIC_URL` | R2 bucket public URL | `https://pub-xxx.r2.dev` | ✅ Yes |
| `VITE_API_URL` | Worker API URL | `https://api.workers.dev` | ✅ Yes |

### Where to Set

| Platform | Location |
|----------|----------|
| Cloudflare Pages | Settings → Environment Variables |
| Local Development | `.env` file in project root |

### Local `.env` File Example

Create `.env` in project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_R2_PUBLIC_URL=https://pub-xxx.r2.dev
VITE_API_URL=https://sajilo-orders-api.xxx.workers.dev
```

**⚠️ NEVER commit `.env` to Git!** It's already in `.gitignore`.

---

## 7. Initial Configuration

### Step 7.1: First Login

1. Open your deployed app URL
2. Navigate to `/auth` (add `/auth` to URL)
3. Login with default credentials:

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `admin123` |

**⚠️ IMPORTANT:** Change these credentials immediately after first login!

### Step 7.2: Configure Restaurant Settings

1. Go to **Admin** → **Settings** tab
2. Configure basic information:

| Setting | Description | Example |
|---------|-------------|---------|
| Restaurant Name | Display name | `Sajilo Cafe` |
| Logo | Upload restaurant logo | 512x512 recommended |
| Table Count | Number of tables | `15` |
| WiFi SSID | WiFi network name | `Sajilo_Guest` |
| WiFi Password | WiFi password | `welcome123` |

3. Configure social links (optional):
   - Instagram URL
   - Facebook URL
   - TikTok URL
   - Google Reviews URL

4. Configure loyalty system:

| Setting | Default | Recommendation |
|---------|---------|----------------|
| Point System Enabled | Off | Turn On |
| Points Per Rupee | 0.1 | 1 point per Rs. 10 spent |
| Point Value (Rs.) | 1 | 1 point = Rs. 1 |
| Max Discount (Rs.) | 500 | Depends on avg order |
| Max Points Per Transaction | 500 | Match max discount |

### Step 7.3: Create Staff Accounts

1. Go to **Admin** → **Staff** tab
2. Click **"Add Staff"**
3. Create accounts:

| Role | Purpose | Access |
|------|---------|--------|
| Admin | Full access | All features |
| Counter | Order management | Counter + Kitchen |

For each staff:
- Username (unique)
- Password
- PIN (optional, for quick actions)
- Role (admin/counter)

### Step 7.4: Set Up Menu

1. Go to **Admin** → **Menu** tab

2. **Create Categories** first:
   - Click **"Add Category"**
   - Examples: Tea, Coffee, Snacks, Meals, Beverages
   - Set prep time per category (minutes)
   - Drag to reorder

3. **Add Menu Items**:
   - Click **"Add Item"**
   - Fill in:
     - Name
     - Price
     - Category
     - Description (optional)
     - Image (upload)
   - Toggle availability

---

## 8. QR Code Generation

### Step 8.1: Understanding QR URLs

Each table has a unique URL:
```
https://[your-domain]/order?table=[number]
```

Example:
- Table 1: `https://sajilo-cafe.pages.dev/order?table=1`
- Table 5: `https://sajilo-cafe.pages.dev/order?table=5`

### Step 8.2: Generate QR Codes

**Option A: Using the App**

1. Go to **Admin** → **QR Codes** tab
2. Click on each table number
3. QR code is displayed
4. Right-click → Save Image As

**Option B: Using External Tool**

1. Go to [qr-code-generator.com](https://www.qr-code-generator.com)
2. Enter table URL
3. Download QR code

### Step 8.3: Print QR Codes

**Recommended Format:**
- Size: 5cm x 5cm minimum
- Include table number text below QR
- Laminate for durability
- Place on table stands or stick to table

**Template:**
```
┌─────────────────────┐
│                     │
│   [QR CODE HERE]    │
│                     │
│  ──────────────────  │
│   TABLE 1           │
│   Scan to Order     │
└─────────────────────┘
```

---

## 9. Custom Domain Setup

### Step 9.1: Add Domain in Cloudflare Pages

1. Go to **Workers & Pages** → Your project
2. Click **"Custom domains"** tab
3. Click **"Set up a custom domain"**
4. Enter your domain: `pos.yourrestaurant.com`

### Step 9.2: Configure DNS

If domain is on Cloudflare:
- Automatic configuration

If domain is elsewhere, add these DNS records:

| Type | Name | Value |
|------|------|-------|
| CNAME | `pos` (or `@` for root) | `sajilo-orders-pos.pages.dev` |

### Step 9.3: Wait for SSL

- SSL certificate is automatically provisioned
- Takes 5-15 minutes
- Site will be available at `https://pos.yourrestaurant.com`

---

## 10. PWA Installation

### For Staff (Counter/Kitchen)

1. Open the app URL on device
2. Chrome Android:
   - Tap three-dot menu → **"Install app"** or **"Add to Home screen"**
3. Safari iOS:
   - Tap share button → **"Add to Home Screen"**

### For Customers

- Customers typically use browser directly via QR scan
- No installation needed
- PWA installs automatically if they visit frequently

---

## 11. Thermal Printer Setup

### Compatible Printers

- Any ESC/POS compatible printer
- 80mm thermal paper recommended
- USB or Network connection

### Supported Models

- Epson TM series
- Star TSP series
- Generic 80mm thermal printers

### Setup Steps

1. Connect printer to computer via USB
2. Go to **Counter** page
3. Click **"Connect Printer"** (in settings)
4. Browser will request USB permission
5. Select your printer
6. Test print to verify

### Web USB Requirements

- Chrome/Edge browser (v89+)
- HTTPS required
- USB permission required

---

## 12. Database Maintenance

### Daily Cleanup (Optional)

Run in Supabase SQL Editor:

```sql
-- Clean up old payment blocks (>24 hours)
DELETE FROM payment_blocks WHERE paid_at < NOW() - INTERVAL '24 hours';

-- Clean up acknowledged waiter calls (>1 hour)
DELETE FROM waiter_calls 
WHERE status = 'acknowledged' 
AND acknowledged_at < NOW() - INTERVAL '1 hour';
```

### Weekly Cleanup (Recommended)

```sql
-- Archive/delete old orders (>30 days, completed/cancelled)
DELETE FROM orders 
WHERE status IN ('completed', 'cancelled') 
AND created_at < NOW() - INTERVAL '30 days';

-- Archive/delete old bills (>30 days, paid)
DELETE FROM bills 
WHERE status = 'paid' 
AND paid_at < NOW() - INTERVAL '30 days';
```

### Monthly Optimization

```sql
-- Vacuum tables for performance
VACUUM ANALYZE orders;
VACUUM ANALYZE transactions;
VACUUM ANALYZE customers;
```

---

## 13. Troubleshooting Guide

### Issue: "Cannot connect to cloud"

**Symptoms:** App shows offline or connection error

**Solutions:**
1. Check Supabase project is running (not paused)
2. Verify environment variables are correct
3. Check browser console for specific errors
4. Try incognito/private window

### Issue: Orders not appearing in real-time

**Symptoms:** Kitchen doesn't see new orders instantly

**Solutions:**
1. Verify Realtime is enabled in Supabase:
   - Database → Replication → Check tables are enabled
2. Check browser console for WebSocket errors
3. Ensure both devices are online

### Issue: Images not uploading

**Symptoms:** "Upload failed" error

**Solutions:**
1. Verify Worker is deployed correctly
2. Check R2 bucket binding in Worker settings
3. Verify `VITE_API_URL` is correct
4. Check Worker logs in Cloudflare Dashboard

### Issue: QR codes not working

**Symptoms:** QR scan leads to 404 or blank page

**Solutions:**
1. Ensure base URL is correct
2. Check table number in URL is valid
3. Verify app is deployed and accessible

### Issue: Login not working

**Symptoms:** "Invalid credentials" error

**Solutions:**
1. Check staff table in Supabase
2. Verify username/password (case-sensitive)
3. Reset password in database if needed:
```sql
UPDATE staff SET password = 'newpassword' WHERE username = 'admin';
```

### Issue: Dark mode not applying

**Symptoms:** Theme toggle doesn't work

**Solutions:**
1. Clear browser cache
2. Check localStorage: `localStorage.getItem('theme')`
3. Verify CSS variables in index.css

### Issue: Sound alerts not playing

**Symptoms:** No audio for new orders

**Solutions:**
1. Enable sound in Admin Settings
2. Check device volume
3. Browser may block autoplay - user must interact first
4. Try different browser

---

## 14. Security Checklist

### Before Go-Live

- [ ] Change default admin password
- [ ] Create individual staff accounts
- [ ] Remove test data
- [ ] Verify RLS policies are active
- [ ] Test all user flows
- [ ] Verify HTTPS is working

### Ongoing Security

- [ ] Regularly update staff passwords
- [ ] Review staff access monthly
- [ ] Monitor Supabase usage
- [ ] Check for unusual activity
- [ ] Keep backups of transactions

### API Key Security

- [ ] Never commit `.env` to Git
- [ ] Use different keys for dev/prod
- [ ] Rotate keys annually
- [ ] Restrict Supabase key permissions

---

## 15. Backup & Recovery

### Transaction Backup

**Export via Admin Dashboard:**
1. Go to **Admin** → **Transactions**
2. Click **"Export CSV"**
3. Save file with date: `transactions_2025-01-15.csv`

**Export via SQL:**
```sql
-- In Supabase SQL Editor
SELECT * FROM transactions 
WHERE paid_at >= '2025-01-01' 
ORDER BY paid_at DESC;
-- Click "Download CSV"
```

### Customer Data Backup

```sql
SELECT * FROM customers ORDER BY last_visit DESC;
```

### Full Database Backup

1. Supabase Dashboard → **Settings** → **Database**
2. Click **"Download backup"**
3. Store securely

### Recovery Procedure

1. Create new Supabase project
2. Run schema.sql
3. Import transaction data
4. Update environment variables
5. Redeploy to Cloudflare Pages

---

## Quick Reference Card

### URLs

| Purpose | URL Pattern |
|---------|-------------|
| Customer Order | `/order?table=[N]` |
| Staff Login | `/auth` |
| Counter View | `/counter` |
| Kitchen View | `/kitchen` |
| Admin Dashboard | `/admin` |

### Default Credentials

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Admin |

### Support Contacts

- **Supabase Status:** status.supabase.com
- **Cloudflare Status:** cloudflarestatus.com
- **Documentation:** [This file]

---

## Deployment Checklist

### New Restaurant Setup

- [ ] Create Supabase project
- [ ] Run database schema
- [ ] Create R2 bucket
- [ ] Deploy Cloudflare Worker
- [ ] Update Worker bindings
- [ ] Fork/clone repository
- [ ] Set environment variables
- [ ] Deploy to Cloudflare Pages
- [ ] Change default password
- [ ] Configure restaurant settings
- [ ] Add menu categories
- [ ] Add menu items with images
- [ ] Create staff accounts
- [ ] Generate and print table QR codes
- [ ] Test complete order flow
- [ ] Set up custom domain (optional)
- [ ] Train staff on usage

---

*Document End - Sajilo Orders POS Technical Setup Guide v1.0*
