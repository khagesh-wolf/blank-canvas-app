import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { MenuItem, Customer, Staff } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, Edit, Trash2, LogOut, Settings, LayoutDashboard, 
  UtensilsCrossed, Users, QrCode, History, TrendingUp, ShoppingBag, DollarSign,
  Download, Search, Eye, UserCog, BarChart3, Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { formatNepalDateTime, formatNepalDateReadable } from '@/lib/nepalTime';
import { QRCodeSVG } from 'qrcode.react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

type Category = 'Tea' | 'Snacks' | 'Cold Drink' | 'Pastry';
const categories: Category[] = ['Tea', 'Snacks', 'Cold Drink', 'Pastry'];

const COLORS = ['#06C167', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function Admin() {
  const navigate = useNavigate();
  const qrRef = useRef<HTMLDivElement>(null);
  const { 
    menuItems, addMenuItem, updateMenuItem, deleteMenuItem, toggleItemAvailability,
    customers, transactions, staff, settings, updateSettings,
    addStaff, updateStaff, deleteStaff,
    isAuthenticated, currentUser, logout, getTodayStats
  } = useStore();

  const [tab, setTab] = useState('dashboard');
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItem, setNewItem] = useState<{ name: string; price: string; category: Category }>({ 
    name: '', price: '', category: 'Tea' 
  });

  // Search states
  const [customerSearch, setCustomerSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');

  // Modal states
  const [customerDetailModal, setCustomerDetailModal] = useState<Customer | null>(null);
  const [staffModal, setStaffModal] = useState<{ open: boolean; editing: Staff | null }>({ open: false, editing: null });
  const [newStaff, setNewStaff] = useState({ username: '', password: '', name: '', role: 'counter' as 'admin' | 'counter' });

  // Analytics states
  const [analyticsDateFrom, setAnalyticsDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [analyticsDateTo, setAnalyticsDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  if (!isAuthenticated || currentUser?.role !== 'admin') {
    navigate('/auth');
    return null;
  }

  const stats = getTodayStats();

  // Calculate analytics data
  const getAnalyticsData = () => {
    const filtered = transactions.filter(t => {
      const date = t.paidAt.split('T')[0];
      return date >= analyticsDateFrom && date <= analyticsDateTo;
    });

    // Revenue by day
    const revenueByDay: Record<string, number> = {};
    filtered.forEach(t => {
      const day = t.paidAt.split('T')[0];
      revenueByDay[day] = (revenueByDay[day] || 0) + t.total;
    });
    const dailyRevenue = Object.entries(revenueByDay)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top items
    const itemCounts: Record<string, { name: string; qty: number; revenue: number }> = {};
    filtered.forEach(t => {
      t.items.forEach(item => {
        if (!itemCounts[item.name]) {
          itemCounts[item.name] = { name: item.name, qty: 0, revenue: 0 };
        }
        itemCounts[item.name].qty += item.qty;
        itemCounts[item.name].revenue += item.qty * item.price;
      });
    });
    const topItems = Object.values(itemCounts)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    // Payment methods
    const paymentMethods = [
      { name: 'Cash', value: filtered.filter(t => t.paymentMethod === 'cash').length },
      { name: 'Fonepay', value: filtered.filter(t => t.paymentMethod === 'fonepay').length },
    ];

    // Peak hours
    const hourCounts: Record<number, number> = {};
    filtered.forEach(t => {
      const hour = new Date(t.paidAt).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const peakHours = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      orders: hourCounts[i] || 0
    }));

    return {
      totalRevenue: filtered.reduce((sum, t) => sum + t.total, 0),
      totalOrders: filtered.length,
      avgOrderValue: filtered.length ? Math.round(filtered.reduce((sum, t) => sum + t.total, 0) / filtered.length) : 0,
      dailyRevenue,
      topItems,
      paymentMethods,
      peakHours,
      transactions: filtered
    };
  };

  const analytics = getAnalyticsData();

  const thisWeekRevenue = transactions
    .filter(t => {
      const date = new Date(t.paidAt);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return date >= weekAgo;
    })
    .reduce((sum, t) => sum + t.total, 0);

  // Filtered data
  const filteredCustomers = customers.filter(c =>
    c.phone.includes(customerSearch) || (c.name && c.name.toLowerCase().includes(customerSearch.toLowerCase()))
  );

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = !historySearch || 
      t.tableNumber.toString().includes(historySearch) ||
      t.customerPhones.some(p => p.includes(historySearch));
    const matchesDateFrom = !historyDateFrom || t.paidAt.split('T')[0] >= historyDateFrom;
    const matchesDateTo = !historyDateTo || t.paidAt.split('T')[0] <= historyDateTo;
    return matchesSearch && matchesDateFrom && matchesDateTo;
  }).sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());

  const handleAddItem = () => {
    if (!newItem.name || !newItem.price) {
      toast.error('Please fill all fields');
      return;
    }
    addMenuItem({ 
      name: newItem.name, 
      price: parseFloat(newItem.price), 
      category: newItem.category, 
      available: true 
    });
    toast.success('Item added');
    setNewItem({ name: '', price: '', category: 'Tea' });
    setIsAddingItem(false);
  };

  const handleUpdateItem = () => {
    if (!editingItem) return;
    updateMenuItem(editingItem.id, editingItem);
    toast.success('Item updated');
    setEditingItem(null);
  };

  const handleAddStaff = () => {
    if (!newStaff.username || !newStaff.password || !newStaff.name) {
      toast.error('Please fill all fields');
      return;
    }
    if (staff.some(s => s.username === newStaff.username)) {
      toast.error('Username already exists');
      return;
    }
    addStaff(newStaff);
    toast.success('Staff added');
    setNewStaff({ username: '', password: '', name: '', role: 'counter' });
    setStaffModal({ open: false, editing: null });
  };

  const handleUpdateStaff = () => {
    if (!staffModal.editing) return;
    updateStaff(staffModal.editing.id, staffModal.editing);
    toast.success('Staff updated');
    setStaffModal({ open: false, editing: null });
  };

  const handleDeleteStaff = (id: string) => {
    if (staff.length <= 1) {
      toast.error('Cannot delete last staff member');
      return;
    }
    if (!confirm('Delete this staff member?')) return;
    deleteStaff(id);
    toast.success('Staff deleted');
  };

  const handleLogout = () => { 
    logout(); 
    navigate('/auth'); 
  };

  const exportCustomersCSV = () => {
    const headers = ['Phone', 'Name', 'Total Orders', 'Total Spent', 'Points', 'Last Visit'];
    const rows = filteredCustomers.map(c => [
      c.phone, c.name || '', c.totalOrders, c.totalSpent, c.points, c.lastVisit
    ]);
    downloadCSV([headers, ...rows], 'customers');
  };

  const exportHistoryCSV = () => {
    const headers = ['Date', 'Table', 'Customers', 'Items', 'Total', 'Discount', 'Method'];
    const rows = filteredTransactions.map(t => [
      formatNepalDateTime(t.paidAt),
      t.tableNumber,
      t.customerPhones.join('; '),
      t.items.map(i => `${i.qty}x ${i.name}`).join('; '),
      t.total,
      t.discount,
      t.paymentMethod
    ]);
    downloadCSV([headers, ...rows], 'transactions');
  };

  const exportAnalyticsCSV = () => {
    const headers = ['Date', 'Table', 'Customers', 'Items', 'Total', 'Discount', 'Method'];
    const rows = analytics.transactions.map(t => [
      formatNepalDateTime(t.paidAt),
      t.tableNumber,
      t.customerPhones.join('; '),
      t.items.map(i => `${i.qty}x ${i.name}`).join('; '),
      t.total,
      t.discount,
      t.paymentMethod
    ]);
    downloadCSV([headers, ...rows], `analytics_${analyticsDateFrom}_to_${analyticsDateTo}`);
  };

  const downloadCSV = (data: any[][], filename: string) => {
    const csv = data.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadQR = (tableNum: number) => {
    const svg = document.getElementById(`qr-${tableNum}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const a = document.createElement('a');
      a.download = `table-${tableNum}-qr.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const printAllQR = () => {
    const printContent = Array.from({ length: settings.tableCount }, (_, i) => i + 1)
      .map(num => `
        <div style="page-break-inside: avoid; text-align: center; padding: 20px; border: 1px solid #ddd; margin: 10px;">
          <h2 style="margin: 0 0 10px;">Table ${num}</h2>
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${settings.baseUrl || window.location.origin}/table/${num}`)}" />
          <p style="margin: 10px 0 0; font-size: 12px;">${settings.restaurantName}</p>
        </div>
      `).join('');
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html><head><title>QR Codes - ${settings.restaurantName}</title></head>
        <body style="display: flex; flex-wrap: wrap; justify-content: center;">
          ${printContent}
        </body></html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'menu', label: 'Menu', icon: UtensilsCrossed },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'history', label: 'History', icon: History },
    { id: 'staff', label: 'Staff', icon: UserCog },
    { id: 'qr', label: 'Tables & QR', icon: QrCode },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <span className="font-bold text-lg">{settings.restaurantName}</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`w-full nav-item ${tab === item.id ? 'nav-item-active' : 'nav-item-inactive'}`}
            >
              <item.icon className="w-5 h-5" /> {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <Button variant="outline" className="w-full" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 overflow-y-auto flex flex-col">
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">{formatNepalDateTime(new Date())}</p>
        </div>
        <div className="flex-1">

        {/* Dashboard */}
        {tab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-4 gap-6">
              <StatCard icon={DollarSign} label="Today's Revenue" value={`रू ${stats.revenue}`} color="primary" />
              <StatCard icon={ShoppingBag} label="Orders Today" value={stats.orders.toString()} color="success" />
              <StatCard icon={TrendingUp} label="This Week" value={`रू ${thisWeekRevenue}`} color="accent" />
              <StatCard icon={Users} label="Total Customers" value={customers.length.toString()} color="warning" />
            </div>

            {/* Quick Charts */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card p-6 rounded-2xl border border-border">
                <h3 className="font-bold mb-4">Revenue Trend (Last 7 Days)</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={analytics.dailyRevenue.slice(-7)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-card p-6 rounded-2xl border border-border">
                <h3 className="font-bold mb-4">Top Selling Items</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={analytics.topItems.slice(0, 5)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
                    <Tooltip />
                    <Bar dataKey="qty" fill="hsl(var(--primary))" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Analytics */}
        {tab === 'analytics' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Analytics & Reports</h2>
              <Button onClick={exportAnalyticsCSV} className="gradient-primary">
                <Download className="w-4 h-4 mr-2" /> Export CSV
              </Button>
            </div>

            <div className="flex gap-4 items-center bg-card p-4 rounded-xl border border-border">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <Input
                type="date"
                value={analyticsDateFrom}
                onChange={e => setAnalyticsDateFrom(e.target.value)}
                className="w-40"
              />
              <span>to</span>
              <Input
                type="date"
                value={analyticsDateTo}
                onChange={e => setAnalyticsDateTo(e.target.value)}
                className="w-40"
              />
            </div>

            {/* Summary Cards */}
            <div className="grid md:grid-cols-3 gap-6">
              <StatCard icon={DollarSign} label="Total Revenue" value={`रू ${analytics.totalRevenue}`} color="primary" />
              <StatCard icon={ShoppingBag} label="Total Orders" value={analytics.totalOrders.toString()} color="success" />
              <StatCard icon={TrendingUp} label="Avg Order Value" value={`रू ${analytics.avgOrderValue}`} color="accent" />
            </div>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card p-6 rounded-2xl border border-border">
                <h3 className="font-bold mb-4">Daily Revenue</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={analytics.dailyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-card p-6 rounded-2xl border border-border">
                <h3 className="font-bold mb-4">Payment Methods</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={analytics.paymentMethods} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>
                      {analytics.paymentMethods.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-card p-6 rounded-2xl border border-border">
                <h3 className="font-bold mb-4">Top 10 Items by Quantity</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.topItems} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} />
                    <Tooltip />
                    <Bar dataKey="qty" fill="hsl(var(--primary))" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-card p-6 rounded-2xl border border-border">
                <h3 className="font-bold mb-4">Peak Hours</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.peakHours.filter(h => h.orders > 0)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="orders" fill="hsl(var(--success))" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Menu */}
        {tab === 'menu' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Menu Management</h2>
              <Button onClick={() => setIsAddingItem(true)} className="gradient-primary">
                <Plus className="w-4 h-4 mr-2" /> Add Item
              </Button>
            </div>
            {categories.map(cat => (
              <div key={cat} className="mb-8">
                <h3 className="font-bold text-lg mb-3 text-primary">{cat}</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {menuItems.filter(m => m.category === cat).map(item => (
                    <div key={item.id} className={`bg-card rounded-xl border border-border p-4 ${!item.available ? 'opacity-50' : ''}`}>
                      <div className="flex justify-between">
                        <div>
                          <h4 className="font-semibold">{item.name}</h4>
                          <p className="text-primary font-bold">रू {item.price}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => toggleItemAvailability(item.id)} className="text-muted-foreground hover:text-foreground">
                            {item.available ? '✓' : '✗'}
                          </button>
                          <button onClick={() => setEditingItem(item)}><Edit className="w-4 h-4 text-muted-foreground" /></button>
                          <button onClick={() => { deleteMenuItem(item.id); toast.success('Deleted'); }}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Customers */}
        {tab === 'customers' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Customers</h2>
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search phone or name..."
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Button onClick={exportCustomersCSV} variant="outline">
                  <Download className="w-4 h-4 mr-2" /> Export CSV
                </Button>
              </div>
            </div>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-4">Phone</th>
                    <th className="text-left p-4">Name</th>
                    <th className="text-left p-4">Orders</th>
                    <th className="text-left p-4">Total Spent</th>
                    <th className="text-left p-4">Points</th>
                    <th className="text-left p-4">Last Visit</th>
                    <th className="text-left p-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No customers found</td></tr>
                  ) : filteredCustomers.map(c => (
                    <tr key={c.phone} className="border-t border-border hover:bg-muted/50">
                      <td className="p-4 font-mono">{c.phone}</td>
                      <td className="p-4">{c.name || '-'}</td>
                      <td className="p-4">{c.totalOrders}</td>
                      <td className="p-4 font-bold">रू {c.totalSpent}</td>
                      <td className="p-4">
                        <span className="bg-warning/10 text-warning px-2 py-1 rounded-full text-sm">
                          ⭐ {c.points}
                        </span>
                      </td>
                      <td className="p-4 text-muted-foreground">{formatNepalDateReadable(c.lastVisit)}</td>
                      <td className="p-4">
                        <Button size="sm" variant="ghost" onClick={() => setCustomerDetailModal(c)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* History */}
        {tab === 'history' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Transaction History</h2>
              <Button onClick={exportHistoryCSV} variant="outline">
                <Download className="w-4 h-4 mr-2" /> Export CSV
              </Button>
            </div>
            <div className="flex gap-3 mb-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search table or phone..."
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Input
                type="date"
                value={historyDateFrom}
                onChange={e => setHistoryDateFrom(e.target.value)}
                className="w-40"
              />
              <Input
                type="date"
                value={historyDateTo}
                onChange={e => setHistoryDateTo(e.target.value)}
                className="w-40"
              />
              <Button variant="outline" onClick={() => { setHistorySearch(''); setHistoryDateFrom(''); setHistoryDateTo(''); }}>
                Clear
              </Button>
            </div>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-4">Time</th>
                    <th className="text-left p-4">Table</th>
                    <th className="text-left p-4">Customers</th>
                    <th className="text-left p-4">Items</th>
                    <th className="text-left p-4">Discount</th>
                    <th className="text-left p-4">Total</th>
                    <th className="text-left p-4">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No transactions found</td></tr>
                  ) : filteredTransactions.slice(0, 50).map(t => (
                    <tr key={t.id} className="border-t border-border hover:bg-muted/50">
                      <td className="p-4">{formatNepalDateTime(t.paidAt)}</td>
                      <td className="p-4">Table {t.tableNumber}</td>
                      <td className="p-4">{t.customerPhones.join(', ') || 'Guest'}</td>
                      <td className="p-4 text-sm max-w-xs truncate">{t.items.map(i => `${i.qty}x ${i.name}`).join(', ')}</td>
                      <td className="p-4">{t.discount > 0 ? `-रू${t.discount}` : '-'}</td>
                      <td className="p-4 font-bold">रू {t.total}</td>
                      <td className="p-4">{t.paymentMethod.toUpperCase()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Staff */}
        {tab === 'staff' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Staff Management</h2>
              <Button onClick={() => setStaffModal({ open: true, editing: null })} className="gradient-primary">
                <Plus className="w-4 h-4 mr-2" /> Add Staff
              </Button>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {staff.map(s => (
                <div key={s.id} className="bg-card rounded-xl border border-border p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold">{s.name}</h4>
                      <p className="text-sm text-muted-foreground">@{s.username}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      s.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    }`}>
                      {s.role.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">Created: {formatNepalDateReadable(s.createdAt)}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setStaffModal({ open: true, editing: s })}>
                      <Edit className="w-3 h-3 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteStaff(s.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* QR */}
        {tab === 'qr' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Tables & QR Codes</h2>
              <Button onClick={printAllQR} className="gradient-primary">
                <Download className="w-4 h-4 mr-2" /> Print All QR
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4" ref={qrRef}>
              {Array.from({ length: settings.tableCount }, (_, i) => i + 1).map(num => (
                <div key={num} className="bg-card rounded-xl border border-border p-4 text-center">
                  <p className="font-bold text-lg mb-2">Table {num}</p>
                  <div className="bg-white p-2 rounded-lg inline-block mb-2">
                    <QRCodeSVG
                      id={`qr-${num}`}
                      value={`${settings.baseUrl || window.location.origin}/table/${num}`}
                      size={120}
                      level="M"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{settings.restaurantName}</p>
                  <Button size="sm" variant="outline" onClick={() => downloadQR(num)}>
                    <Download className="w-3 h-3 mr-1" /> Download
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings */}
        {tab === 'settings' && (
          <div className="max-w-md">
            <h2 className="text-2xl font-bold mb-6">Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Restaurant Name</label>
                <Input value={settings.restaurantName} onChange={e => updateSettings({ restaurantName: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Table Count</label>
                <Input type="number" value={settings.tableCount} onChange={e => updateSettings({ tableCount: parseInt(e.target.value) || 10 })} />
              </div>
              <div>
                <label className="text-sm font-medium">Base URL (for QR codes)</label>
                <Input value={settings.baseUrl} onChange={e => updateSettings({ baseUrl: e.target.value })} placeholder={window.location.origin} />
              </div>
              <div>
                <label className="text-sm font-medium">WiFi SSID</label>
                <Input value={settings.wifiSSID} onChange={e => updateSettings({ wifiSSID: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">WiFi Password</label>
                <Input value={settings.wifiPassword} onChange={e => updateSettings({ wifiPassword: e.target.value })} />
              </div>
            </div>
          </div>
        )}
        </div>
        
        {/* Copyright Footer */}
        <footer className="mt-auto pt-8 pb-4 text-center border-t border-border">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {settings.restaurantName}. All rights reserved.
          </p>
        </footer>
      </main>

      {/* Add Item Modal */}
      <Dialog open={isAddingItem} onOpenChange={setIsAddingItem}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Menu Item</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <Input placeholder="Item name" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
            <Input placeholder="Price" type="number" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} />
            <Select value={newItem.category} onValueChange={(v: Category) => setNewItem({ ...newItem, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingItem(false)}>Cancel</Button>
            <Button onClick={handleAddItem} className="gradient-primary">Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Modal */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Item</DialogTitle></DialogHeader>
          {editingItem && (
            <div className="space-y-4 py-4">
              <Input value={editingItem.name} onChange={e => setEditingItem({ ...editingItem, name: e.target.value })} />
              <Input type="number" value={editingItem.price} onChange={e => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) })} />
              <Select value={editingItem.category} onValueChange={(v: Category) => setEditingItem({ ...editingItem, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
            <Button onClick={handleUpdateItem} className="gradient-primary">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Detail Modal */}
      <Dialog open={!!customerDetailModal} onOpenChange={() => setCustomerDetailModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Customer Details</DialogTitle></DialogHeader>
          {customerDetailModal && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-bold">{customerDetailModal.phone}</p>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Loyalty Points</p>
                  <p className="font-bold text-warning">⭐ {customerDetailModal.points}</p>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="font-bold">{customerDetailModal.totalOrders}</p>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                  <p className="font-bold text-primary">रू {customerDetailModal.totalSpent}</p>
                </div>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Last Visit</p>
                <p className="font-bold">{formatNepalDateTime(customerDetailModal.lastVisit)}</p>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Loyalty Tier</p>
                <p className="font-bold">
                  {customerDetailModal.totalSpent >= 10000 ? '🥇 Gold' : 
                   customerDetailModal.totalSpent >= 5000 ? '🥈 Silver' : 
                   customerDetailModal.totalSpent >= 1000 ? '🥉 Bronze' : '⭐ Regular'}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Staff Modal */}
      <Dialog open={staffModal.open} onOpenChange={(open) => !open && setStaffModal({ open: false, editing: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{staffModal.editing ? 'Edit Staff' : 'Add Staff'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {staffModal.editing ? (
              <>
                <Input 
                  placeholder="Name" 
                  value={staffModal.editing.name} 
                  onChange={e => setStaffModal({ ...staffModal, editing: { ...staffModal.editing!, name: e.target.value }})} 
                />
                <Input 
                  placeholder="Username" 
                  value={staffModal.editing.username} 
                  onChange={e => setStaffModal({ ...staffModal, editing: { ...staffModal.editing!, username: e.target.value }})} 
                />
                <Input 
                  placeholder="New Password (leave empty to keep)" 
                  type="password"
                  onChange={e => e.target.value && setStaffModal({ ...staffModal, editing: { ...staffModal.editing!, password: e.target.value }})} 
                />
                <Select 
                  value={staffModal.editing.role} 
                  onValueChange={(v: 'admin' | 'counter') => setStaffModal({ ...staffModal, editing: { ...staffModal.editing!, role: v }})}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="counter">Counter</SelectItem>
                  </SelectContent>
                </Select>
              </>
            ) : (
              <>
                <Input placeholder="Name" value={newStaff.name} onChange={e => setNewStaff({ ...newStaff, name: e.target.value })} />
                <Input placeholder="Username" value={newStaff.username} onChange={e => setNewStaff({ ...newStaff, username: e.target.value })} />
                <Input placeholder="Password" type="password" value={newStaff.password} onChange={e => setNewStaff({ ...newStaff, password: e.target.value })} />
                <Select value={newStaff.role} onValueChange={(v: 'admin' | 'counter') => setNewStaff({ ...newStaff, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="counter">Counter</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStaffModal({ open: false, editing: null })}>Cancel</Button>
            <Button onClick={staffModal.editing ? handleUpdateStaff : handleAddStaff} className="gradient-primary">
              {staffModal.editing ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { 
  icon: any; label: string; value: string; 
  color: 'primary' | 'success' | 'accent' | 'warning';
}) {
  const colorClasses = {
    primary: 'text-primary bg-primary/10',
    success: 'text-success bg-success/10',
    accent: 'text-secondary bg-secondary/10',
    warning: 'text-warning bg-warning/10',
  };

  return (
    <div className="bg-card p-6 rounded-2xl border border-border">
      <div className={`w-12 h-12 rounded-xl ${colorClasses[color]} flex items-center justify-center mb-4`}>
        <Icon className="w-6 h-6" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
