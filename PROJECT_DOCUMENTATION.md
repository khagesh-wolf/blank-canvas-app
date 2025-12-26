# Chiyadani POS - Complete Project Documentation

**Version:** 1.0  
**Last Updated:** 2025-12-26  
**Type:** Restaurant Point of Sale (POS) System  

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Features Overview](#features-overview)
3. [Technical Architecture](#technical-architecture)
4. [Time & Cost Savings](#time--cost-savings)
5. [Complete Setup Guide](#complete-setup-guide)
6. [User Workflows](#user-workflows)
7. [Troubleshooting](#troubleshooting)
8. [Maintenance Guide](#maintenance-guide)

---

## Executive Summary

Chiyadani POS is a **modern, cloud-based restaurant management system** designed specifically for cafes and restaurants in Nepal. It eliminates paper-based ordering, reduces staff workload, and provides real-time analytics - all while running on completely **free-tier cloud services**.

### Key Value Propositions

| Benefit | Impact |
|---------|--------|
| **Zero Hardware Cost** | No expensive POS terminals needed - runs on any smartphone/tablet |
| **Contactless Ordering** | Customers order via QR code at their table |
| **Real-time Kitchen Display** | Orders appear instantly in kitchen - no missed orders |
| **Automatic Loyalty Program** | Points system encourages repeat visits |
| **Complete Analytics** | Track revenue, popular items, peak hours |
| **Offline Support** | Works even when internet is slow/down |
| **Multi-device Sync** | Counter, Kitchen, Admin all sync in real-time |

### Monthly Capacity (Free Tier)

- **~50,000+ customers/month**
- **Unlimited menu items**
- **Unlimited staff accounts**
- **Unlimited transaction history**

---

## Features Overview

### 1. Customer Ordering (QR-Based)

Customers scan a QR code at their table to access the digital menu.

**Features:**
- 📱 Mobile-optimized responsive design
- 🍽️ Browse menu by categories
- ❤️ Save favorite items (persists across visits)
- 🛒 Add to cart with special instructions
- ⏱️ Real-time wait time estimates
- 🔔 Call waiter button
- 📊 View order history and bill status
- 🎯 Loyalty points display
- 🔥 Popular items badge (shows top 5 sellers)
- 🚫 3-hour payment block (prevents reordering after bill payment)

**Session Management:**
- Phone number persists across sessions
- 4-hour table session timeout
- Session closes after bill payment
- Prevents ordering from old QR codes

### 2. Counter/Staff View

The central hub for staff to manage all restaurant operations.

**Features:**
- ✅ Accept/Reject incoming orders
- 🧾 Generate and print KOT (Kitchen Order Tickets)
- 💵 Process payments (Cash or Fonepay)
- 🗺️ Visual table map with color-coded status:
  - 🟢 Green = Empty table
  - 🟡 Yellow = Ordering (pending orders)
  - 🔴 Red = Occupied (orders being prepared)
  - 🟣 Purple = Waiting (orders ready to serve)
- 🔔 Audio notifications for new orders
- 📊 Cash register with daily summary
- 💸 Track expenses (ingredients, utilities, salary, etc.)
- 🧾 Print receipts (thermal printer support via Web USB)

### 3. Kitchen Display System (KDS)

Dedicated view for kitchen staff.

**Features:**
- 👨‍🍳 Pending orders with timer
- ✅ Accept orders to start preparing
- ❌ Cancel/reject orders
- 🔔 Sound alerts for new orders
- 📱 Touch-optimized large buttons
- 🔄 Real-time sync with counter

### 4. Admin Dashboard

Complete business management interface.

**Tabs:**

#### Dashboard
- 📈 Daily revenue chart
- 🥧 Top selling items
- 📊 Key metrics (revenue, orders, customers, avg order)
- 📅 Date range filtering

#### Menu Management
- ➕ Add/Edit/Delete menu items
- 📁 Category management with drag-and-drop reorder
- 🖼️ Image upload (CDN via Cloudflare R2)
- 🔄 Bulk enable/disable items
- ⏱️ Set prep time per category
- 🔍 Search and filter

#### Staff Management
- 👥 Add Counter/Admin staff
- 🔐 Username/Password + optional PIN
- ✏️ Edit/Delete staff accounts
- 🛡️ Role-based access control

#### Customer Database
- 📱 View all customers by phone
- 🏆 Loyalty points tracking
- 📊 Order history per customer
- ✏️ Edit phone numbers
- 📥 Export to CSV

#### Transaction History
- 📜 All completed transactions
- 🔍 Search by table, phone, date
- 💳 Payment method breakdown
- 📥 Export to CSV

#### Analytics
- 📈 Revenue trends over time
- 🏆 Top 10 selling items
- 💳 Cash vs Fonepay breakdown
- ⏰ Peak hours analysis
- 👥 Unique customer count

#### Settings
- 🏪 Restaurant name and logo
- 📶 WiFi credentials (displayed in customer menu)
- 🔗 Social media links
- 🎨 Dark mode toggle
- 🔊 Sound alerts toggle
- 🏆 Loyalty points configuration
- 📍 Table count

### 5. Progressive Web App (PWA)

**Customer App:**
- Install on home screen
- Works offline (menu browsing)
- Camera QR scanner
- Push notification ready

**Staff App:**
- Offline order queue
- Syncs when back online
- Fast load times
- No app store needed

### 6. Payment Integration

**Supported Methods:**
- 💵 Cash
- 📱 Fonepay QR (Nepal's popular payment)

**Features:**
- Dynamic QR code generation
- Automatic bill calculation
- Discount/loyalty points redemption
- Receipt printing

### 7. Loyalty Points System

**Configurable:**
- Points earned per rupee spent
- Point value in rupees
- Maximum discount limit
- Maximum points per transaction

**Default: 1 point per Rs. 10 spent, 1 point = Rs. 1**

### 8. Real-time Sync

All views sync instantly using Supabase Realtime:
- New orders appear immediately in Kitchen/Counter
- Order status changes reflect everywhere
- Waiter calls show instantly
- No refresh needed

### 9. Dark Mode

- System preference detection
- Manual toggle in settings
- Saves battery on OLED screens
- Reduces eye strain in dim environments

### 10. Receipt/Thermal Printing

- Web USB API support
- ESC/POS compatible printers
- 80mm thermal paper
- KOT and Bill printing

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CUSTOMERS                                │
│              (Mobile Phones via QR Code)                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                   Cloudflare Pages                               │
│                   (Frontend Hosting)                             │
│                                                                  │
│   • React + TypeScript + Vite                                   │
│   • Tailwind CSS + shadcn/ui                                    │
│   • PWA with offline support                                    │
│   • Global CDN (300+ locations)                                 │
│   • Automatic HTTPS                                             │
│   • Unlimited bandwidth (FREE)                                  │
└───────────────┬─────────────────────────────────┬───────────────┘
                │                                 │
┌───────────────▼───────────────┐ ┌───────────────▼───────────────┐
│     Cloudflare R2             │ │         Supabase              │
│     (Image CDN)               │ │    (Database + Realtime)      │
│                               │ │                               │
│   • Menu item images          │ │   • PostgreSQL database       │
│   • Restaurant logo           │ │   • Real-time subscriptions   │
│   • Auto WebP conversion      │ │   • Row Level Security        │
│   • Global edge caching       │ │   • Unlimited API calls       │
│   • 10GB free/month           │ │   • 500MB database (FREE)     │
└───────────────────────────────┘ └───────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18 | UI Framework |
| **Language** | TypeScript | Type safety |
| **Build** | Vite | Fast bundling |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **Components** | shadcn/ui | Reusable UI components |
| **State** | Zustand | Global state management |
| **Routing** | React Router v6 | Navigation |
| **Database** | Supabase (PostgreSQL) | Data persistence |
| **Realtime** | Supabase Realtime | Live updates |
| **Image CDN** | Cloudflare R2 | Image storage |
| **Hosting** | Cloudflare Pages | Frontend deployment |
| **PWA** | vite-plugin-pwa | Offline support |

### Database Schema

**Tables:**
- `categories` - Menu categories (Tea, Coffee, Snacks, etc.)
- `menu_items` - Menu items with price, description, image
- `orders` - Customer orders with items and status
- `bills` - Aggregated bills for payment
- `transactions` - Completed payment records
- `customers` - Customer database with loyalty points
- `staff` - Staff accounts with roles
- `settings` - Restaurant configuration
- `expenses` - Daily expense tracking
- `waiter_calls` - Customer service requests
- `payment_blocks` - 3-hour cooldown after payment

---

## Time & Cost Savings

### Before vs After Comparison

| Task | Manual System | Chiyadani POS | Time Saved |
|------|---------------|---------------|------------|
| Taking order | 3-5 min | 30 sec | 80-90% |
| Kitchen communication | Walk to kitchen | Instant | 100% |
| Bill calculation | 2-3 min | Instant | 100% |
| Daily reports | 30-60 min | 1 click | 95% |
| Customer loyalty tracking | Not possible | Automatic | ∞ |
| Missed orders | Common | Zero | 100% |
| Peak hour management | Chaotic | Visual queue | 90% better |

### Monthly Cost Comparison

| Solution | Monthly Cost (NPR) | Annual Cost |
|----------|-------------------|-------------|
| Traditional POS System | Rs. 50,000+ setup + Rs. 5,000/month | Rs. 110,000+ |
| Tablet-based POS | Rs. 3,000-5,000/month | Rs. 36,000-60,000 |
| **Chiyadani POS** | **Rs. 0** | **Rs. 0** |

### Automation Features

1. **Auto-cancel Pending Orders**: Orders not accepted in 30 minutes are automatically cancelled
2. **Session Auto-logout**: Customer sessions expire after 4 hours
3. **Payment Block**: Prevents reordering from old QR codes for 3 hours after payment
4. **Rush Hour Detection**: Automatically adjusts wait time estimates during busy periods
5. **Popular Items**: Automatically calculates and badges top 5 selling items
6. **Points Calculation**: Automatically calculates and awards loyalty points

---

## Complete Setup Guide

### Prerequisites

1. **GitHub Account** (free) - For code repository
2. **Supabase Account** (free) - For database
3. **Cloudflare Account** (free) - For hosting and images

### Step 1: Supabase Setup (Database)

#### 1.1 Create Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up/Login
3. Click **"New Project"**
4. Fill in:
   - **Name**: `chiyadani-pos`
   - **Database Password**: (save this!)
   - **Region**: Mumbai (closest to Nepal)
5. Click **"Create new project"**
6. Wait 2-3 minutes for setup

#### 1.2 Run Database Schema

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Copy the entire contents of `supabase/schema.sql` from the project
4. Click **"Run"**
5. Should see "Success. No rows returned"

#### 1.3 Get API Keys

1. Go to **Settings** → **API**
2. Copy these values (you'll need them later):
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIs...`

### Step 2: Cloudflare R2 Setup (Image Storage)

#### 2.1 Create R2 Bucket

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Sign up/Login
3. In sidebar, click **"R2"**
4. Click **"Create bucket"**
5. Name: `chiyadani-images`
6. Click **"Create bucket"**

#### 2.2 Enable Public Access

1. Go to your bucket settings
2. Click **"Settings"** tab
3. Under **"Public access"**, click **"Allow Access"**
4. Copy the **Public bucket URL**: `https://pub-xxxx.r2.dev`

#### 2.3 Create API Token

1. Go to **R2** → **Manage R2 API Tokens**
2. Click **"Create API token"**
3. Name: `chiyadani-worker`
4. Permissions: **Object Read & Write**
5. Specify bucket: `chiyadani-images`
6. Click **"Create API Token"**
7. Save the **Access Key ID** and **Secret Access Key**

### Step 3: Deploy Image Worker

#### Option A: Using Cloudflare Dashboard (Easiest)

1. In Cloudflare, go to **Workers & Pages**
2. Click **"Create application"** → **"Create Worker"**
3. Name: `chiyadani-api`
4. Click **"Deploy"**
5. Click **"Edit code"**
6. Delete all code and paste contents of `workers/image-upload.js`
7. Go to **Settings** → **Variables**
8. Add **Environment Variables**:
   - `R2_PUBLIC_URL`: Your public bucket URL
9. Add **R2 Bucket Bindings**:
   - Variable name: `R2_BUCKET`
   - R2 bucket: `chiyadani-images`
10. Click **"Save and Deploy"**
11. Note the worker URL: `https://chiyadani-api.YOUR-SUBDOMAIN.workers.dev`

#### Option B: Using Wrangler CLI

```bash
# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Navigate to workers folder
cd workers

# Update wrangler.toml with your account_id and bucket URL

# Deploy
wrangler deploy
```

### Step 4: Cloudflare Pages Setup (Frontend)

#### 4.1 Push to GitHub

```bash
# Create new repository on GitHub
# Then push your code:
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/chiyadani-pos.git
git push -u origin main
```

#### 4.2 Connect to Cloudflare Pages

1. In Cloudflare Dashboard, go to **Workers & Pages**
2. Click **"Create application"** → **"Pages"** → **"Connect to Git"**
3. Select your GitHub repository
4. Configure build:
   - **Framework preset**: Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`

#### 4.3 Add Environment Variables

In Cloudflare Pages → **Settings** → **Environment Variables**, add:

| Variable | Value | Environment |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` | Production |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` | Production |
| `VITE_R2_PUBLIC_URL` | `https://pub-xxxx.r2.dev` | Production |
| `VITE_API_URL` | `https://chiyadani-api.xxx.workers.dev` | Production |

#### 4.4 Deploy

1. Click **"Save and Deploy"**
2. Wait 2-3 minutes
3. Your app is live at: `https://chiyadani-pos.pages.dev`

### Step 5: Custom Domain (Optional)

1. In Cloudflare Pages → **Custom domains**
2. Click **"Set up a custom domain"**
3. Enter your domain (e.g., `pos.yourrestaurant.com`)
4. Add the DNS records as instructed

### Step 6: First Time Setup

1. Open your deployed app
2. Go to `/auth` (login page)
3. Default credentials:
   - **Username**: `admin`
   - **Password**: `admin123`
4. Go to Admin → Settings
5. Configure:
   - Restaurant name
   - Logo (upload image)
   - Number of tables
   - WiFi credentials
   - Social media links

### Step 7: Generate Table QR Codes

1. In Admin Dashboard, go to **"QR Codes"** tab
2. Click on each table to view its QR code
3. Print QR codes and place on tables

---

## User Workflows

### Customer Journey

```
┌─────────────────┐
│ Scan Table QR   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Enter Phone No. │ (10 digits)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Browse Menu     │ ──► Add items to cart
└────────┬────────┘     Set special instructions
         │
         ▼
┌─────────────────┐
│ Place Order     │ ──► Wait time shown
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Track Status    │ ──► Pending → Accepted → Ready
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ View Bill       │ ──► Points displayed
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Pay at Counter  │ ──► Cash or Fonepay
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Session Closed  │ ──► 3-hour block active
└─────────────────┘
```

### Staff Workflow (Counter)

```
┌─────────────────┐
│ New Order Alert │ 🔔 Sound notification
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Accept Order    │ ──► KOT prints automatically
└────────┬────────┘     Order sent to kitchen
         │
         ▼
┌─────────────────┐
│ Customer Pays   │ ──► Select payment method
└────────┬────────┘     Apply discount if any
         │
         ▼
┌─────────────────┐
│ Complete Sale   │ ──► Receipt prints
└────────┬────────┘     Points awarded
         │
         ▼
┌─────────────────┐
│ Table Cleared   │ ──► Session closed
└─────────────────┘
```

### Kitchen Workflow

```
┌─────────────────┐
│ New Order       │ 🔔 Sound alert
│ Appears         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Accept Order    │ ──► Start preparing
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Mark as Done    │ ──► Counter notified
└─────────────────┘     Serve to customer
```

---

## Troubleshooting

### Common Issues

#### 1. "Cannot connect to cloud" Error

**Cause**: Supabase connection failed

**Solutions**:
- Check `VITE_SUPABASE_URL` is correct
- Check `VITE_SUPABASE_ANON_KEY` is correct
- Ensure database tables exist (run schema.sql)
- Check browser console for specific error

#### 2. Realtime Not Working

**Cause**: Realtime not enabled for tables

**Solutions**:
1. Go to Supabase → Database → Replication
2. Ensure these tables are in the publication:
   - orders
   - waiter_calls
   - bills

#### 3. Image Upload Fails

**Cause**: R2 or Worker misconfigured

**Solutions**:
- Check `VITE_API_URL` points to your worker
- Verify R2 bucket binding in worker settings
- Check R2_PUBLIC_URL environment variable
- Verify R2 API token permissions

#### 4. QR Code Not Working

**Cause**: Incorrect base URL

**Solutions**:
1. Go to Admin → Settings
2. Update Base URL to your deployed domain
3. Regenerate QR codes

#### 5. Sound Alerts Not Playing

**Cause**: Browser autoplay restrictions

**Solutions**:
- User must interact with page first
- Ensure sound alerts are enabled in settings
- Check device is not on silent mode

#### 6. PWA Not Installing

**Cause**: Missing PWA requirements

**Solutions**:
- Must be served over HTTPS
- Check manifest.json exists
- Ensure service worker is registered

---

## Maintenance Guide

### Daily Tasks

- [ ] Review any failed orders
- [ ] Check expense entries
- [ ] Verify cash register balance

### Weekly Tasks

- [ ] Export transaction history
- [ ] Review analytics for insights
- [ ] Check customer feedback
- [ ] Update menu if needed

### Monthly Tasks

- [ ] Review Supabase usage (500MB limit)
- [ ] Check R2 bandwidth usage (10GB limit)
- [ ] Export customer database backup
- [ ] Update staff credentials if needed

### Backup Procedures

#### Database Backup

1. Go to Supabase → Settings → Database
2. Click "Download backup"
3. Store securely

#### Export Transactions

1. Admin → History
2. Set date range
3. Click Export CSV

#### Export Customers

1. Admin → Customers
2. Click Export CSV

### Scaling

When you exceed free tier limits:

| Service | Free Limit | Upgrade Cost |
|---------|------------|--------------|
| Supabase | 500MB database | $25/month for 8GB |
| R2 | 10GB/month bandwidth | $0.015/GB after |
| Pages | Unlimited | Always free |

---

## Support Contacts

### Technical Support

- **Supabase**: [github.com/supabase/supabase/discussions](https://github.com/supabase/supabase/discussions)
- **Cloudflare**: [community.cloudflare.com](https://community.cloudflare.com)

### Feature Requests

Contact the development team for:
- Custom features
- Integration with other payment methods
- Multi-branch support
- Advanced reporting

---

## Appendix

### Default Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Counter | counter | counter123 |

**⚠️ IMPORTANT: Change these immediately after first login!**

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/` | Customer landing/scan page |
| `/table/:number` | Table ordering page |
| `/auth` | Staff login |
| `/counter` | Counter/Staff view |
| `/kitchen` | Kitchen display |
| `/admin` | Admin dashboard |
| `/install` | PWA installation page |

### Keyboard Shortcuts (Counter/Admin)

| Shortcut | Action |
|----------|--------|
| `Ctrl+F` | Focus search |
| `Escape` | Close modal |

---

**Document End**

*Chiyadani POS - Making restaurant management simple, efficient, and free.*
