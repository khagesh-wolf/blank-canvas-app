import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import Database from 'better-sqlite3';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Initialize SQLite database
const db = new Database('chiyadani.db');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS menu_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    category TEXT NOT NULL,
    available INTEGER DEFAULT 1,
    description TEXT,
    image TEXT
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    table_number INTEGER NOT NULL,
    customer_phone TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    total REAL NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    menu_item_id TEXT NOT NULL,
    name TEXT NOT NULL,
    qty INTEGER NOT NULL,
    price REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id)
  );

  CREATE TABLE IF NOT EXISTS bills (
    id TEXT PRIMARY KEY,
    table_number INTEGER NOT NULL,
    customer_phones TEXT NOT NULL,
    subtotal REAL NOT NULL,
    discount REAL DEFAULT 0,
    total REAL NOT NULL,
    status TEXT DEFAULT 'unpaid',
    payment_method TEXT,
    paid_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bill_orders (
    bill_id TEXT NOT NULL,
    order_id TEXT NOT NULL,
    PRIMARY KEY (bill_id, order_id),
    FOREIGN KEY (bill_id) REFERENCES bills(id),
    FOREIGN KEY (order_id) REFERENCES orders(id)
  );

  CREATE TABLE IF NOT EXISTS customers (
    phone TEXT PRIMARY KEY,
    name TEXT,
    total_orders INTEGER DEFAULT 0,
    total_spent REAL DEFAULT 0,
    points INTEGER DEFAULT 0,
    last_visit TEXT
  );

  CREATE TABLE IF NOT EXISTS staff (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    restaurant_name TEXT DEFAULT 'Chiya Dani',
    table_count INTEGER DEFAULT 10,
    wifi_ssid TEXT,
    wifi_password TEXT,
    base_url TEXT,
    logo TEXT,
    instagram_url TEXT,
    facebook_url TEXT,
    tiktok_url TEXT,
    google_review_url TEXT
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    amount REAL NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    created_at TEXT NOT NULL,
    created_by TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS waiter_calls (
    id TEXT PRIMARY KEY,
    table_number INTEGER NOT NULL,
    customer_phone TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT NOT NULL,
    acknowledged_at TEXT
  );

  INSERT OR IGNORE INTO settings (id) VALUES (1);
`);

app.use(cors());
app.use(express.json());

// Broadcast to all connected clients
function broadcast(type, data) {
  const message = JSON.stringify({ type, data });
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

// ============ MENU ITEMS ============
app.get('/api/menu', (req, res) => {
  const items = db.prepare('SELECT * FROM menu_items').all();
  res.json(items.map(item => ({
    ...item,
    available: Boolean(item.available)
  })));
});

app.post('/api/menu', (req, res) => {
  const { id, name, price, category, available, description, image } = req.body;
  db.prepare(`
    INSERT INTO menu_items (id, name, price, category, available, description, image)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, price, category, available ? 1 : 0, description, image);
  broadcast('MENU_UPDATE', { action: 'add', item: req.body });
  res.json({ success: true });
});

app.put('/api/menu/:id', (req, res) => {
  const { name, price, category, available, description, image } = req.body;
  db.prepare(`
    UPDATE menu_items SET name=?, price=?, category=?, available=?, description=?, image=?
    WHERE id=?
  `).run(name, price, category, available ? 1 : 0, description, image, req.params.id);
  broadcast('MENU_UPDATE', { action: 'update', item: { id: req.params.id, ...req.body } });
  res.json({ success: true });
});

app.delete('/api/menu/:id', (req, res) => {
  db.prepare('DELETE FROM menu_items WHERE id=?').run(req.params.id);
  broadcast('MENU_UPDATE', { action: 'delete', id: req.params.id });
  res.json({ success: true });
});

// ============ ORDERS ============
app.get('/api/orders', (req, res) => {
  const orders = db.prepare('SELECT * FROM orders').all();
  const orderItems = db.prepare('SELECT * FROM order_items').all();
  
  const ordersWithItems = orders.map(order => ({
    id: order.id,
    tableNumber: order.table_number,
    customerPhone: order.customer_phone,
    status: order.status,
    total: order.total,
    notes: order.notes,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    items: orderItems.filter(item => item.order_id === order.id).map(item => ({
      id: item.id,
      menuItemId: item.menu_item_id,
      name: item.name,
      qty: item.qty,
      price: item.price
    }))
  }));
  res.json(ordersWithItems);
});

app.post('/api/orders', (req, res) => {
  const { id, tableNumber, customerPhone, items, status, total, notes, createdAt, updatedAt } = req.body;
  
  db.prepare(`
    INSERT INTO orders (id, table_number, customer_phone, status, total, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, tableNumber, customerPhone, status, total, notes, createdAt, updatedAt);
  
  const insertItem = db.prepare(`
    INSERT INTO order_items (id, order_id, menu_item_id, name, qty, price)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  items.forEach(item => {
    insertItem.run(item.id, id, item.menuItemId, item.name, item.qty, item.price);
  });
  
  broadcast('ORDER_UPDATE', { action: 'add', order: req.body });
  res.json({ success: true });
});

app.put('/api/orders/:id/status', (req, res) => {
  const { status } = req.body;
  const now = new Date().toISOString();
  db.prepare('UPDATE orders SET status=?, updated_at=? WHERE id=?').run(status, now, req.params.id);
  broadcast('ORDER_UPDATE', { action: 'status', id: req.params.id, status });
  res.json({ success: true });
});

// ============ BILLS ============
app.get('/api/bills', (req, res) => {
  const bills = db.prepare('SELECT * FROM bills').all();
  const billOrders = db.prepare('SELECT * FROM bill_orders').all();
  const orders = db.prepare('SELECT * FROM orders').all();
  const orderItems = db.prepare('SELECT * FROM order_items').all();
  
  const billsWithOrders = bills.map(bill => {
    const orderIds = billOrders.filter(bo => bo.bill_id === bill.id).map(bo => bo.order_id);
    const billOrdersData = orders.filter(o => orderIds.includes(o.id)).map(order => ({
      id: order.id,
      tableNumber: order.table_number,
      customerPhone: order.customer_phone,
      status: order.status,
      total: order.total,
      notes: order.notes,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      items: orderItems.filter(item => item.order_id === order.id).map(item => ({
        id: item.id,
        menuItemId: item.menu_item_id,
        name: item.name,
        qty: item.qty,
        price: item.price
      }))
    }));
    
    return {
      id: bill.id,
      tableNumber: bill.table_number,
      customerPhones: JSON.parse(bill.customer_phones),
      subtotal: bill.subtotal,
      discount: bill.discount,
      total: bill.total,
      status: bill.status,
      paymentMethod: bill.payment_method,
      paidAt: bill.paid_at,
      createdAt: bill.created_at,
      orders: billOrdersData
    };
  });
  res.json(billsWithOrders);
});

app.post('/api/bills', (req, res) => {
  const { id, tableNumber, orders, customerPhones, subtotal, discount, total, status, createdAt } = req.body;
  
  db.prepare(`
    INSERT INTO bills (id, table_number, customer_phones, subtotal, discount, total, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, tableNumber, JSON.stringify(customerPhones), subtotal, discount, total, status, createdAt);
  
  const insertBillOrder = db.prepare('INSERT INTO bill_orders (bill_id, order_id) VALUES (?, ?)');
  orders.forEach(order => {
    insertBillOrder.run(id, order.id);
  });
  
  broadcast('BILL_UPDATE', { action: 'add', bill: req.body });
  res.json({ success: true });
});

app.put('/api/bills/:id/pay', (req, res) => {
  const { paymentMethod, paidAt } = req.body;
  db.prepare(`
    UPDATE bills SET status='paid', payment_method=?, paid_at=? WHERE id=?
  `).run(paymentMethod, paidAt, req.params.id);
  broadcast('BILL_UPDATE', { action: 'pay', id: req.params.id, paymentMethod, paidAt });
  res.json({ success: true });
});

// ============ CUSTOMERS ============
app.get('/api/customers', (req, res) => {
  const customers = db.prepare('SELECT * FROM customers').all();
  res.json(customers.map(c => ({
    phone: c.phone,
    name: c.name,
    totalOrders: c.total_orders,
    totalSpent: c.total_spent,
    points: c.points,
    lastVisit: c.last_visit
  })));
});

app.post('/api/customers', (req, res) => {
  const { phone, name, totalOrders, totalSpent, points, lastVisit } = req.body;
  db.prepare(`
    INSERT OR REPLACE INTO customers (phone, name, total_orders, total_spent, points, last_visit)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(phone, name, totalOrders, totalSpent, points, lastVisit);
  broadcast('CUSTOMER_UPDATE', req.body);
  res.json({ success: true });
});

// ============ STAFF ============
app.get('/api/staff', (req, res) => {
  const staff = db.prepare('SELECT * FROM staff').all();
  res.json(staff.map(s => ({
    id: s.id,
    username: s.username,
    password: s.password,
    role: s.role,
    name: s.name,
    createdAt: s.created_at
  })));
});

app.post('/api/staff', (req, res) => {
  const { id, username, password, role, name, createdAt } = req.body;
  db.prepare(`
    INSERT INTO staff (id, username, password, role, name, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, username, password, role, name, createdAt);
  res.json({ success: true });
});

// ============ SETTINGS ============
app.get('/api/settings', (req, res) => {
  const settings = db.prepare('SELECT * FROM settings WHERE id=1').get();
  res.json({
    restaurantName: settings.restaurant_name,
    tableCount: settings.table_count,
    wifiSSID: settings.wifi_ssid,
    wifiPassword: settings.wifi_password,
    baseUrl: settings.base_url,
    logo: settings.logo,
    instagramUrl: settings.instagram_url,
    facebookUrl: settings.facebook_url,
    tiktokUrl: settings.tiktok_url,
    googleReviewUrl: settings.google_review_url
  });
});

app.put('/api/settings', (req, res) => {
  const { restaurantName, tableCount, wifiSSID, wifiPassword, baseUrl, logo, instagramUrl, facebookUrl, tiktokUrl, googleReviewUrl } = req.body;
  db.prepare(`
    UPDATE settings SET 
      restaurant_name=?, table_count=?, wifi_ssid=?, wifi_password=?, base_url=?, 
      logo=?, instagram_url=?, facebook_url=?, tiktok_url=?, google_review_url=?
    WHERE id=1
  `).run(restaurantName, tableCount, wifiSSID, wifiPassword, baseUrl, logo, instagramUrl, facebookUrl, tiktokUrl, googleReviewUrl);
  broadcast('SETTINGS_UPDATE', req.body);
  res.json({ success: true });
});

// ============ EXPENSES ============
app.get('/api/expenses', (req, res) => {
  const expenses = db.prepare('SELECT * FROM expenses').all();
  res.json(expenses.map(e => ({
    id: e.id,
    amount: e.amount,
    description: e.description,
    category: e.category,
    createdAt: e.created_at,
    createdBy: e.created_by
  })));
});

app.post('/api/expenses', (req, res) => {
  const { id, amount, description, category, createdAt, createdBy } = req.body;
  db.prepare(`
    INSERT INTO expenses (id, amount, description, category, created_at, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, amount, description, category, createdAt, createdBy);
  broadcast('EXPENSE_UPDATE', { action: 'add', expense: req.body });
  res.json({ success: true });
});

// ============ WAITER CALLS ============
app.get('/api/waiter-calls', (req, res) => {
  const calls = db.prepare('SELECT * FROM waiter_calls').all();
  res.json(calls.map(c => ({
    id: c.id,
    tableNumber: c.table_number,
    customerPhone: c.customer_phone,
    status: c.status,
    createdAt: c.created_at,
    acknowledgedAt: c.acknowledged_at
  })));
});

app.post('/api/waiter-calls', (req, res) => {
  const { id, tableNumber, customerPhone, status, createdAt } = req.body;
  db.prepare(`
    INSERT INTO waiter_calls (id, table_number, customer_phone, status, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, tableNumber, customerPhone, status, createdAt);
  broadcast('WAITER_CALL', { action: 'add', call: req.body });
  res.json({ success: true });
});

app.put('/api/waiter-calls/:id/acknowledge', (req, res) => {
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE waiter_calls SET status='acknowledged', acknowledged_at=? WHERE id=?
  `).run(now, req.params.id);
  broadcast('WAITER_CALL', { action: 'acknowledge', id: req.params.id });
  res.json({ success: true });
});

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.on('close', () => console.log('Client disconnected'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`WebSocket running on ws://0.0.0.0:${PORT}`);
});
