import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MenuItem, Order, Bill, Transaction, Customer, Staff, Settings, OrderStatus, OrderItem, Expense } from '@/types';
import { getNepalTimestamp, isToday } from '@/lib/nepalTime';

const generateId = () => Math.random().toString(36).substring(2, 11);

const defaultMenuItems: MenuItem[] = [
  // Tea
  { id: '1', name: 'Masala Chai', price: 30, category: 'Tea', available: true },
  { id: '2', name: 'Ginger Tea', price: 35, category: 'Tea', available: true },
  { id: '3', name: 'Green Tea', price: 40, category: 'Tea', available: true },
  { id: '4', name: 'Black Tea', price: 25, category: 'Tea', available: true },
  { id: '5', name: 'Milk Tea', price: 30, category: 'Tea', available: true },
  { id: '6', name: 'Lemon Tea', price: 35, category: 'Tea', available: true },
  // Snacks
  { id: '7', name: 'Samosa', price: 25, category: 'Snacks', available: true },
  { id: '8', name: 'Pakoda', price: 40, category: 'Snacks', available: true },
  { id: '9', name: 'Sandwich', price: 60, category: 'Snacks', available: true },
  { id: '10', name: 'Momo (Veg)', price: 80, category: 'Snacks', available: true },
  { id: '11', name: 'Momo (Chicken)', price: 100, category: 'Snacks', available: true },
  // Cold Drinks
  { id: '12', name: 'Coca Cola', price: 40, category: 'Cold Drink', available: true },
  { id: '13', name: 'Sprite', price: 40, category: 'Cold Drink', available: true },
  { id: '14', name: 'Iced Tea', price: 50, category: 'Cold Drink', available: true },
  { id: '15', name: 'Lassi', price: 60, category: 'Cold Drink', available: true },
  // Pastry
  { id: '16', name: 'Chocolate Cake', price: 80, category: 'Pastry', available: true },
  { id: '17', name: 'Vanilla Pastry', price: 60, category: 'Pastry', available: true },
  { id: '18', name: 'Brownie', price: 70, category: 'Pastry', available: true },
];

const defaultSettings: Settings = {
  restaurantName: 'Chiyadani',
  tableCount: 10,
  wifiSSID: '',
  wifiPassword: '',
  baseUrl: typeof window !== 'undefined' ? window.location.origin : '',
};

const defaultStaff: Staff[] = [
  {
    id: '1',
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    name: 'Administrator',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    username: 'counter',
    password: 'counter123',
    role: 'counter',
    name: 'Counter Staff',
    createdAt: new Date().toISOString(),
  },
];

interface AuthState {
  isAuthenticated: boolean;
  currentUser: Staff | null;
}

interface StoreState extends AuthState {
  // Auth
  login: (username: string, password: string) => boolean;
  logout: () => void;

  // Menu
  menuItems: MenuItem[];
  addMenuItem: (item: Omit<MenuItem, 'id'>) => void;
  updateMenuItem: (id: string, item: Partial<MenuItem>) => void;
  deleteMenuItem: (id: string) => void;
  toggleItemAvailability: (id: string) => void;

  // Orders
  orders: Order[];
  addOrder: (tableNumber: number, customerPhone: string, items: OrderItem[], notes?: string) => Order;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  getOrdersByTable: (tableNumber: number) => Order[];
  getOrdersByPhone: (phone: string) => Order[];
  getPendingOrders: () => Order[];
  getActiveOrders: () => Order[];

  // Bills
  bills: Bill[];
  createBill: (tableNumber: number, orderIds: string[], discount?: number) => Bill;
  payBill: (billId: string, paymentMethod: 'cash' | 'fonepay') => void;
  redeemPoints: (phone: string, points: number) => void;
  getUnpaidOrdersByTable: (tableNumber: number) => Order[];

  // Transactions
  transactions: Transaction[];

  // Customers
  customers: Customer[];
  getCustomerPoints: (phone: string) => number;
  addOrUpdateCustomer: (phone: string, amount: number) => void;

  // Staff
  staff: Staff[];
  addStaff: (staff: Omit<Staff, 'id' | 'createdAt'>) => void;
  updateStaff: (id: string, staff: Partial<Staff>) => void;
  deleteStaff: (id: string) => void;

  // Settings
  settings: Settings;
  updateSettings: (settings: Partial<Settings>) => void;

  // Expenses
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  deleteExpense: (id: string) => void;
  getExpensesByDateRange: (start: string, end: string) => Expense[];

  // Stats
  getTodayStats: () => { revenue: number; orders: number; activeOrders: number; activeTables: number };
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // Auth
      isAuthenticated: false,
      currentUser: null,

      login: (username, password) => {
        const user = get().staff.find(
          s => s.username === username && s.password === password
        );
        if (user) {
          set({ isAuthenticated: true, currentUser: user });
          return true;
        }
        return false;
      },

      logout: () => {
        set({ isAuthenticated: false, currentUser: null });
      },

      // Menu
      menuItems: defaultMenuItems,

      addMenuItem: (item) => set((state) => ({
        menuItems: [...state.menuItems, { ...item, id: generateId() }]
      })),

      updateMenuItem: (id, item) => set((state) => ({
        menuItems: state.menuItems.map(m => m.id === id ? { ...m, ...item } : m)
      })),

      deleteMenuItem: (id) => set((state) => ({
        menuItems: state.menuItems.filter(m => m.id !== id)
      })),

      toggleItemAvailability: (id) => set((state) => ({
        menuItems: state.menuItems.map(m =>
          m.id === id ? { ...m, available: !m.available } : m
        )
      })),

      // Orders
      orders: [],

      addOrder: (tableNumber, customerPhone, items, notes) => {
        const now = getNepalTimestamp();
        const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
        const newOrder: Order = {
          id: generateId(),
          tableNumber,
          customerPhone,
          items,
          status: 'pending',
          createdAt: now,
          updatedAt: now,
          total,
          notes,
        };
        set((state) => ({ orders: [...state.orders, newOrder] }));
        
        // Update customer
        get().addOrUpdateCustomer(customerPhone, 0);
        
        return newOrder;
      },

      updateOrderStatus: (id, status) => set((state) => ({
        orders: state.orders.map(o =>
          o.id === id ? { ...o, status, updatedAt: getNepalTimestamp() } : o
        )
      })),

      getOrdersByTable: (tableNumber) => 
        get().orders.filter(o => o.tableNumber === tableNumber && o.status !== 'cancelled'),

      getOrdersByPhone: (phone) => 
        get().orders.filter(o => o.customerPhone === phone),

      getPendingOrders: () => 
        get().orders.filter(o => o.status === 'pending'),

      getActiveOrders: () => 
        get().orders.filter(o => ['pending', 'accepted', 'preparing', 'ready'].includes(o.status)),

      // Bills
      bills: [],

      createBill: (tableNumber, orderIds, discount = 0) => {
        const orders = get().orders.filter(o => orderIds.includes(o.id));
        const customerPhones = [...new Set(orders.map(o => o.customerPhone))];
        const subtotal = orders.reduce((sum, o) => sum + o.total, 0);
        
        const bill: Bill = {
          id: generateId(),
          tableNumber,
          orders,
          customerPhones,
          subtotal,
          discount,
          total: subtotal - discount,
          status: 'unpaid',
          createdAt: getNepalTimestamp(),
        };
        
        set((state) => ({ bills: [...state.bills, bill] }));
        return bill;
      },

      payBill: (billId, paymentMethod) => {
        const bill = get().bills.find(b => b.id === billId);
        if (!bill) return;

        const paidAt = getNepalTimestamp();

        // Create transaction
        const transaction: Transaction = {
          id: generateId(),
          billId,
          tableNumber: bill.tableNumber,
          customerPhones: bill.customerPhones,
          total: bill.total,
          discount: bill.discount,
          paymentMethod,
          paidAt,
          items: bill.orders.flatMap(o => o.items),
        };

        // Update bill and orders
        set((state) => ({
          bills: state.bills.map(b =>
            b.id === billId ? { ...b, status: 'paid' as const, paymentMethod, paidAt } : b
          ),
          orders: state.orders.map(o =>
            bill.orders.some(bo => bo.id === o.id) ? { ...o, status: 'served' as OrderStatus } : o
          ),
          transactions: [...state.transactions, transaction],
        }));

        // Update customer spending
        bill.customerPhones.forEach(phone => {
        get().addOrUpdateCustomer(phone, bill.total / bill.customerPhones.length);
      });

      // Deduct redeemed points if discount was applied
      if (bill.discount > 0) {
        bill.customerPhones.forEach(phone => {
          get().redeemPoints(phone, bill.discount);
        });
      }
      },

      getUnpaidOrdersByTable: (tableNumber) =>
        get().orders.filter(o => 
          o.tableNumber === tableNumber && 
          ['accepted', 'preparing', 'ready', 'served'].includes(o.status) &&
          !get().bills.some(b => b.status === 'paid' && b.orders.some(bo => bo.id === o.id))
        ),

      // Transactions
      transactions: [],

      // Customers
      customers: [],

      getCustomerPoints: (phone) => {
        const customer = get().customers.find(c => c.phone === phone);
        return customer?.points || 0;
      },

      addOrUpdateCustomer: (phone, amount) => set((state) => {
        const existing = state.customers.find(c => c.phone === phone);
        // 10 rs spent = 1 point
        const newPoints = Math.floor(amount / 10);
        if (existing) {
          return {
            customers: state.customers.map(c =>
              c.phone === phone
                ? {
                    ...c,
                    totalOrders: c.totalOrders + (amount > 0 ? 1 : 0),
                    totalSpent: c.totalSpent + amount,
                    points: c.points + newPoints,
                    lastVisit: getNepalTimestamp(),
                  }
                : c
            )
          };
        }
        return {
          customers: [...state.customers, {
            phone,
            totalOrders: amount > 0 ? 1 : 0,
            totalSpent: amount,
            points: newPoints,
            lastVisit: getNepalTimestamp(),
          }]
        };
      }),

      redeemPoints: (phone, points) => set((state) => {
        const existing = state.customers.find(c => c.phone === phone);
        if (!existing) return {};
        return {
          customers: state.customers.map(c =>
            c.phone === phone
              ? { ...c, points: Math.max(0, c.points - points) }
              : c
          )
        };
      }),

      // Staff
      staff: defaultStaff,

      addStaff: (staffData) => set((state) => ({
        staff: [...state.staff, { ...staffData, id: generateId(), createdAt: getNepalTimestamp() }]
      })),

      updateStaff: (id, staffData) => set((state) => ({
        staff: state.staff.map(s => s.id === id ? { ...s, ...staffData } : s)
      })),

      deleteStaff: (id) => set((state) => ({
        staff: state.staff.filter(s => s.id !== id)
      })),

      // Settings
      settings: defaultSettings,

      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),

      // Expenses
      expenses: [],

      addExpense: (expense) => set((state) => ({
        expenses: [...state.expenses, { ...expense, id: generateId(), createdAt: getNepalTimestamp() }]
      })),

      deleteExpense: (id) => set((state) => ({
        expenses: state.expenses.filter(e => e.id !== id)
      })),

      getExpensesByDateRange: (start, end) => {
        return get().expenses.filter(e => {
          const date = new Date(e.createdAt);
          return date >= new Date(start) && date <= new Date(end + 'T23:59:59');
        });
      },

      // Stats
      getTodayStats: () => {
        const todayTransactions = get().transactions.filter(t => isToday(t.paidAt));
        const activeOrders = get().getActiveOrders();
        const activeTables = new Set(activeOrders.map(o => o.tableNumber)).size;

        return {
          revenue: todayTransactions.reduce((sum, t) => sum + t.total, 0),
          orders: todayTransactions.length,
          activeOrders: activeOrders.length,
          activeTables,
        };
      },
    }),
    {
      name: 'chiyadani-store',
      partialize: (state) => ({
        ...state,
        // Persist auth state
        isAuthenticated: state.isAuthenticated,
        currentUser: state.currentUser,
      }),
    }
  )
);

// Realtime sync using BroadcastChannel API
const channel = typeof window !== 'undefined' ? new BroadcastChannel('chiyadani-sync') : null;
let isBroadcasting = false;

if (channel) {
  // Listen for updates from other tabs
  channel.onmessage = (event) => {
    if (event.data.type === 'STATE_UPDATE') {
      isBroadcasting = true;
      useStore.setState(event.data.state);
      isBroadcasting = false;
    }
  };

  // Broadcast state changes to other tabs
  useStore.subscribe((state) => {
    if (!isBroadcasting) {
      channel.postMessage({
        type: 'STATE_UPDATE',
        state: {
          orders: state.orders,
          bills: state.bills,
          transactions: state.transactions,
          customers: state.customers,
          menuItems: state.menuItems,
          expenses: state.expenses,
        }
      });
    }
  });
}
