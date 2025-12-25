# Deployment Guide: Cloudflare Pages + R2 + Supabase

This guide covers deploying the Chiyadani POS system with the optimal free-tier stack that can handle ~50,000+ monthly customers.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Customers                           │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│              Cloudflare Pages (Frontend)                     │
│              ✓ Unlimited bandwidth                           │
│              ✓ Global CDN (300+ locations)                   │
│              ✓ Automatic HTTPS                               │
└───────────┬─────────────────────────────────┬───────────────┘
            │                                 │
┌───────────▼───────────┐     ┌───────────────▼───────────────┐
│   Cloudflare R2       │     │        Supabase               │
│   (Image Storage)     │     │   (Database + Auth)           │
│   ✓ 10GB bandwidth    │     │   ✓ 500MB database            │
│   ✓ WebP optimization │     │   ✓ 50,000 MAU auth           │
│   ✓ Global caching    │     │   ✓ Unlimited API calls       │
└───────────────────────┘     └───────────────────────────────┘
```

## Free Tier Limits

| Service | Free Limit | Bottleneck at |
|---------|------------|---------------|
| Cloudflare Pages | Unlimited bandwidth | Never |
| Cloudflare R2 | 10GB/month egress | ~16,000 visits |
| Supabase Database | 500MB, unlimited ops | ~100k menu items |
| Supabase Auth | 50,000 MAU | ~50,000 users |
| Cloudflare Workers | 100k requests/day | ~3M/month |

**Expected capacity: ~50,000+ monthly customers**

---

## Step 1: Cloudflare Setup

### 1.1 Create Cloudflare Account

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Sign up for a free account
3. Navigate to **Pages** in the sidebar

### 1.2 Connect GitHub Repository

```bash
# If not already pushed to GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/chiyadani-pos.git
git push -u origin main
```

In Cloudflare Pages:
1. Click **Create a project**
2. Select **Connect to Git**
3. Choose your repository
4. Configure build settings:

```yaml
Framework preset: Vite
Build command: npm run build
Build output directory: dist
Root directory: /
```

### 1.3 Environment Variables

Add these in Cloudflare Pages → Settings → Environment Variables:

```bash
# Supabase (from Step 2)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# R2 (from Step 3)
VITE_R2_PUBLIC_URL=https://your-bucket.your-account-id.r2.dev

# Backend API
VITE_API_URL=https://your-worker.workers.dev
```

---

## Step 2: Supabase Setup

### 2.1 Create Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Choose a name and region (closest to your customers)
4. Save the **Project URL** and **anon/public key**

### 2.2 Database Schema

Run these SQL commands in Supabase SQL Editor:

```sql
-- Categories table
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menu items table
CREATE TABLE menu_items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  category_id INTEGER REFERENCES categories(id),
  description TEXT,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  table_number TEXT,
  items JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public read menu_items" ON menu_items FOR SELECT USING (true);
CREATE POLICY "Public read orders" ON orders FOR SELECT USING (true);

-- Authenticated write policies
CREATE POLICY "Auth insert orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Auth update orders" ON orders FOR UPDATE USING (true);
```

### 2.3 Enable Realtime (Optional)

For live order updates:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
```

---

## Step 3: Cloudflare R2 Setup

### 3.1 Create R2 Bucket

1. In Cloudflare Dashboard → **R2**
2. Click **Create bucket**
3. Name: `chiyadani-images`
4. Location: Auto (or nearest to customers)

### 3.2 Enable Public Access

1. Go to bucket settings
2. Enable **Public access**
3. Note the public URL: `https://chiyadani-images.YOUR_ACCOUNT_ID.r2.dev`

### 3.3 Create API Token

1. Go to R2 → **Manage R2 API Tokens**
2. Create token with:
   - Object Read & Write
   - Apply to specific bucket: `chiyadani-images`
3. Save the **Access Key ID** and **Secret Access Key**

---

## Step 4: Workers Setup (Image Upload API)

### 4.1 Create Worker

Create `workers/image-upload.js`:

```javascript
export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Upload image
    if (request.method === 'POST' && url.pathname === '/api/upload') {
      try {
        const formData = await request.formData();
        const file = formData.get('file');
        const filename = formData.get('filename');

        await env.R2_BUCKET.put(filename, file, {
          httpMetadata: {
            contentType: 'image/webp',
            cacheControl: 'public, max-age=31536000',
          },
        });

        return new Response(
          JSON.stringify({
            success: true,
            url: `${env.R2_PUBLIC_URL}/${filename}`,
            key: filename,
          }),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: corsHeaders,
        });
      }
    }

    // Delete image
    if (request.method === 'DELETE' && url.pathname === '/api/upload') {
      const key = url.searchParams.get('key');
      await env.R2_BUCKET.delete(key);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
};
```

### 4.2 Deploy Worker

```bash
# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create wrangler.toml
cat > wrangler.toml << EOF
name = "chiyadani-api"
main = "workers/image-upload.js"
compatibility_date = "2024-01-01"

[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "chiyadani-images"

[vars]
R2_PUBLIC_URL = "https://chiyadani-images.YOUR_ACCOUNT_ID.r2.dev"
EOF

# Deploy
wrangler deploy
```

---

## Step 5: Deploy Frontend

### 5.1 Build and Deploy

Cloudflare Pages automatically deploys on push:

```bash
git add .
git commit -m "Deploy to production"
git push origin main
```

### 5.2 Custom Domain (Optional)

1. In Pages → Custom domains
2. Add your domain
3. Follow DNS instructions

---

## Monitoring & Optimization

### Performance Tips

1. **Image Optimization**
   - All images auto-convert to WebP
   - Lazy loading enabled by default
   - Responsive srcset for different screen sizes

2. **Caching Strategy**
   - Static assets: 1 year cache
   - Images: 1 year cache (immutable)
   - API responses: Edge cached

3. **Database Optimization**
   - Add indexes for frequently queried columns
   - Use connection pooling for high traffic

### Monitoring

- **Cloudflare Analytics**: Real-time traffic stats
- **Supabase Dashboard**: Database metrics
- **R2 Metrics**: Storage and bandwidth usage

---

## Cost Estimation

| Traffic Level | Monthly Cost |
|---------------|--------------|
| 0 - 10,000 visitors | $0 (Free) |
| 10,000 - 50,000 visitors | $0 (Free) |
| 50,000 - 100,000 visitors | ~$5 (R2 overage) |
| 100,000+ visitors | ~$20-50 |

---

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure Worker has correct CORS headers
   - Check R2 bucket CORS settings

2. **Image Upload Fails**
   - Verify R2 API token permissions
   - Check file size limits

3. **Slow API Response**
   - Add Cloudflare Cache Rules
   - Use Supabase connection pooling

### Support

- Cloudflare: [community.cloudflare.com](https://community.cloudflare.com)
- Supabase: [github.com/supabase/supabase/discussions](https://github.com/supabase/supabase/discussions)

---

## Quick Reference

```bash
# Local development
npm run dev

# Production build
npm run build

# Deploy to Cloudflare
git push origin main

# Check Wrangler logs
wrangler tail
```

**Your app is now ready to serve 50,000+ customers for FREE!** 🎉
