# Chiya Dani Backend (SQLite)

Local SQLite backend server for cross-device sync on your local network.

## Requirements

- Node.js 18+ 
- npm or bun

## Setup

```bash
cd backend
npm install
```

## Run

```bash
npm start
# or for development with auto-reload:
npm run dev
```

Server will start on `http://0.0.0.0:3001`

## API Endpoints

### Menu Items
- `GET /api/menu` - Get all menu items
- `POST /api/menu` - Add menu item
- `PUT /api/menu/:id` - Update menu item
- `DELETE /api/menu/:id` - Delete menu item

### Orders
- `GET /api/orders` - Get all orders
- `POST /api/orders` - Create order
- `PUT /api/orders/:id/status` - Update order status

### Bills
- `GET /api/bills` - Get all bills
- `POST /api/bills` - Create bill
- `PUT /api/bills/:id/pay` - Mark bill as paid

### Customers
- `GET /api/customers` - Get all customers
- `POST /api/customers` - Add/update customer

### Staff
- `GET /api/staff` - Get all staff
- `POST /api/staff` - Add staff

### Settings
- `GET /api/settings` - Get settings
- `PUT /api/settings` - Update settings

### Expenses
- `GET /api/expenses` - Get all expenses
- `POST /api/expenses` - Add expense

### Waiter Calls
- `GET /api/waiter-calls` - Get all waiter calls
- `POST /api/waiter-calls` - Create waiter call
- `PUT /api/waiter-calls/:id/acknowledge` - Acknowledge call

## WebSocket

Connect to `ws://YOUR_IP:3001` for real-time updates.

Message types received:
- `MENU_UPDATE`
- `ORDER_UPDATE`
- `BILL_UPDATE`
- `CUSTOMER_UPDATE`
- `SETTINGS_UPDATE`
- `EXPENSE_UPDATE`
- `WAITER_CALL`

## Network Access

To access from other devices on your local network:
1. Find your laptop's IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Use `http://YOUR_IP:3001` from other devices

## Database

SQLite database is stored in `chiyadani.db` in this folder.
