import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { OrderItem } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Minus, 
  ShoppingCart, 
  CreditCard, 
  Banknote, 
  Check,
  History,
  Receipt,
  Search,
  X,
  LogOut,
  Printer
} from 'lucide-react';
import { toast } from 'sonner';
import { formatNepalTime, formatNepalDateTime } from '@/lib/nepalTime';

export default function Counter() {
  const navigate = useNavigate();
  const { 
    menuItems, 
    orders, 
    bills, 
    transactions,
    createBill, 
    addOrder,
    payBill,
    updateOrderStatus,
    getUnpaidOrdersByTable,
    isAuthenticated,
    currentUser,
    logout,
    settings
  } = useStore();

  const [tab, setTab] = useState('orders');
  const [billingTable, setBillingTable] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [paymentModal, setPaymentModal] = useState(false);
  const [currentBillId, setCurrentBillId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // New order state
  const [orderTable, setOrderTable] = useState('');
  const [orderPhone, setOrderPhone] = useState('');
  const [cart, setCart] = useState<OrderItem[]>([]);

  // Redirect if not authenticated
  if (!isAuthenticated) {
    navigate('/auth');
    return null;
  }

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const activeOrders = orders.filter(o => ['accepted', 'preparing', 'ready'].includes(o.status));
  const unpaidBills = bills.filter(b => b.status === 'unpaid');
  const categories = [...new Set(menuItems.map(m => m.category))];

  const addToCart = (item: typeof menuItems[0]) => {
    const existing = cart.find(c => c.menuItemId === item.id);
    if (existing) {
      setCart(cart.map(c => 
        c.menuItemId === item.id ? { ...c, qty: c.qty + 1 } : c
      ));
    } else {
      setCart([...cart, { 
        id: Math.random().toString(36).substring(2, 9),
        menuItemId: item.id, 
        name: item.name, 
        qty: 1, 
        price: item.price 
      }]);
    }
  };

  const updateCartQty = (menuItemId: string, delta: number) => {
    setCart(cart.map(c => {
      if (c.menuItemId === menuItemId) {
        const newQty = c.qty + delta;
        return newQty > 0 ? { ...c, qty: newQty } : c;
      }
      return c;
    }).filter(c => c.qty > 0));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const placeOrder = () => {
    if (!orderTable || !orderPhone || cart.length === 0) {
      toast.error('Please fill table number, phone, and add items');
      return;
    }
    const tableNum = parseInt(orderTable);
    addOrder(tableNum, orderPhone, cart);
    toast.success('Order placed successfully!');
    setCart([]);
    setOrderTable('');
    setOrderPhone('');
  };

  const handleAccept = (orderId: string) => {
    updateOrderStatus(orderId, 'accepted');
    toast.success('Order accepted - Print for kitchen');
  };

  const handleReject = (orderId: string) => {
    updateOrderStatus(orderId, 'cancelled');
    toast.info('Order rejected');
  };

  const handleLookupTable = () => {
    const tableNum = parseInt(billingTable);
    if (!tableNum) {
      toast.error('Enter a valid table number');
      return;
    }
    const unpaidOrders = getUnpaidOrdersByTable(tableNum);
    if (unpaidOrders.length === 0) {
      toast.error('No unpaid orders for this table');
      return;
    }
    setSelectedOrderIds(unpaidOrders.map(o => o.id));
  };

  const handleCreateBill = () => {
    if (selectedOrderIds.length === 0) return;
    const tableNum = parseInt(billingTable);
    const bill = createBill(tableNum, selectedOrderIds, 0);
    setCurrentBillId(bill.id);
    setPaymentModal(true);
  };

  const handlePayment = (method: 'cash' | 'fonepay') => {
    if (!currentBillId) return;
    payBill(currentBillId, method);
    toast.success(`Payment completed via ${method}`);
    setPaymentModal(false);
    setCurrentBillId(null);
    setSelectedOrderIds([]);
    setBillingTable('');
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const filteredTransactions = searchTerm 
    ? transactions.filter(t => 
        t.tableNumber.toString().includes(searchTerm) || 
        t.customerPhones.some(c => c.includes(searchTerm))
      )
    : transactions;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{settings.restaurantName} - Counter</h1>
          <p className="text-sm text-muted-foreground">{formatNepalDateTime(new Date())}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{currentUser?.name}</span>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar - Pending Orders */}
        <div className="w-80 bg-card border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold flex items-center gap-2">
              Incoming Orders
              {pendingOrders.length > 0 && (
                <span className="bg-warning text-warning-foreground px-2 py-0.5 rounded-full text-xs">
                  {pendingOrders.length}
                </span>
              )}
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
            {pendingOrders.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">No pending orders</div>
            ) : (
              pendingOrders.map(order => (
                <div key={order.id} className="bg-muted rounded-xl p-3 border-l-4 border-warning animate-slide-up">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-bold">Table {order.tableNumber}</span>
                      <p className="text-xs text-muted-foreground">{order.customerPhone}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatNepalTime(order.createdAt)}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm mb-3">
                    {order.items.map((item, idx) => (
                      <div key={idx}>{item.qty}x {item.name}</div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 bg-success hover:bg-success/90" onClick={() => handleAccept(order.id)}>
                      <Check className="w-3 h-3 mr-1" /> Accept
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleAccept(order.id)}>
                      <Printer className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleReject(order.id)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col">
            <div className="border-b border-border px-4 bg-card">
              <TabsList className="bg-transparent h-12">
                <TabsTrigger value="orders" className="data-[state=active]:gradient-primary data-[state=active]:text-white">
                  <ShoppingCart className="w-4 h-4 mr-2" /> New Order
                </TabsTrigger>
                <TabsTrigger value="active" className="data-[state=active]:gradient-primary data-[state=active]:text-white">
                  Active ({activeOrders.length})
                </TabsTrigger>
                <TabsTrigger value="billing" className="data-[state=active]:gradient-primary data-[state=active]:text-white">
                  <Receipt className="w-4 h-4 mr-2" /> Billing
                </TabsTrigger>
                <TabsTrigger value="history" className="data-[state=active]:gradient-primary data-[state=active]:text-white">
                  <History className="w-4 h-4 mr-2" /> History
                </TabsTrigger>
              </TabsList>
            </div>

            {/* New Order Tab */}
            <TabsContent value="orders" className="flex-1 flex m-0">
              <div className="flex-1 p-4 overflow-y-auto scrollbar-thin">
                <div className="flex gap-4 mb-4">
                  <Input placeholder="Table No." value={orderTable} onChange={(e) => setOrderTable(e.target.value)} className="w-32" type="number" />
                  <Input placeholder="Customer Phone" value={orderPhone} onChange={(e) => setOrderPhone(e.target.value)} className="w-48" />
                </div>
                {categories.map(category => (
                  <div key={category} className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 text-primary">{category}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {menuItems.filter(m => m.category === category && m.available).map(item => (
                        <button key={item.id} onClick={() => addToCart(item)} className="menu-card p-4 text-left">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-primary font-bold">रू {item.price}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Cart Sidebar */}
              <div className="w-80 bg-card border-l border-border flex flex-col">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4" /> Cart
                    {cart.length > 0 && <span className="gradient-primary text-white px-2 py-0.5 rounded-full text-xs">{cart.reduce((s, c) => s + c.qty, 0)}</span>}
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin">
                  {cart.length === 0 ? <div className="text-center text-muted-foreground py-8">Cart is empty</div> : cart.map(item => (
                    <div key={item.id} className="flex items-center justify-between bg-muted p-2 rounded-lg">
                      <div><p className="font-medium text-sm">{item.name}</p><p className="text-xs text-muted-foreground">रू {item.price}</p></div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateCartQty(item.menuItemId, -1)} className="w-6 h-6 rounded bg-card flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                        <span className="w-6 text-center font-medium">{item.qty}</span>
                        <button onClick={() => updateCartQty(item.menuItemId, 1)} className="w-6 h-6 rounded gradient-primary flex items-center justify-center text-white"><Plus className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-border space-y-3">
                  <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-primary">रू {cartTotal}</span></div>
                  <Button className="w-full gradient-primary" size="lg" disabled={cart.length === 0 || !orderTable || !orderPhone} onClick={placeOrder}>Place Order</Button>
                </div>
              </div>
            </TabsContent>

            {/* Active Orders Tab */}
            <TabsContent value="active" className="flex-1 p-4 overflow-y-auto m-0">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeOrders.map(order => (
                  <div key={order.id} className="bg-card rounded-xl border border-border p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-bold">Table {order.tableNumber}</span>
                        <StatusBadge status={order.status} className="ml-2" />
                      </div>
                      <span className="text-xs text-muted-foreground">{formatNepalTime(order.createdAt)}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mb-3">{order.items.map(i => `${i.qty}x ${i.name}`).join(', ')}</div>
                    <div className="flex gap-2">
                      {order.status === 'accepted' && <Button size="sm" className="flex-1" onClick={() => updateOrderStatus(order.id, 'preparing')}>Start Preparing</Button>}
                      {order.status === 'preparing' && <Button size="sm" className="flex-1 bg-success" onClick={() => updateOrderStatus(order.id, 'ready')}>Mark Ready</Button>}
                      {order.status === 'ready' && <Button size="sm" className="flex-1" variant="outline" onClick={() => updateOrderStatus(order.id, 'served')}>Mark Served</Button>}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Billing Tab */}
            <TabsContent value="billing" className="flex-1 p-4 m-0">
              <div className="max-w-md mx-auto">
                <div className="bg-card rounded-xl border border-border p-6">
                  <h2 className="font-bold text-lg mb-4">Generate Bill</h2>
                  <div className="flex gap-2 mb-4">
                    <Input placeholder="Table Number" value={billingTable} onChange={(e) => setBillingTable(e.target.value)} type="number" />
                    <Button onClick={handleLookupTable}><Search className="w-4 h-4 mr-2" /> Find</Button>
                  </div>
                  {selectedOrderIds.length > 0 && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">{selectedOrderIds.length} order(s) found</p>
                      <Button onClick={handleCreateBill} className="w-full gradient-primary">Create Bill & Pay</Button>
                    </div>
                  )}
                </div>

                {unpaidBills.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-bold mb-4">Unpaid Bills</h3>
                    <div className="space-y-3">
                      {unpaidBills.map(bill => (
                        <div key={bill.id} className="bg-card rounded-xl border border-border p-4">
                          <div className="flex justify-between mb-2">
                            <span className="font-bold">Table {bill.tableNumber}</span>
                            <span className="font-bold text-primary">रू {bill.total}</span>
                          </div>
                          <Button size="sm" className="w-full" onClick={() => { setCurrentBillId(bill.id); setPaymentModal(true); }}>Pay Now</Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="flex-1 p-4 overflow-y-auto m-0">
              <div className="flex gap-4 mb-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search by table or phone" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
              </div>
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-4 font-semibold">Time</th>
                      <th className="text-left p-4 font-semibold">Table</th>
                      <th className="text-left p-4 font-semibold">Customers</th>
                      <th className="text-left p-4 font-semibold">Total</th>
                      <th className="text-left p-4 font-semibold">Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No transactions</td></tr>
                    ) : filteredTransactions.slice().reverse().map(t => (
                      <tr key={t.id} className="border-t border-border">
                        <td className="p-4">{formatNepalDateTime(t.paidAt)}</td>
                        <td className="p-4">Table {t.tableNumber}</td>
                        <td className="p-4">{t.customerPhones.join(', ')}</td>
                        <td className="p-4 font-bold">रू {t.total}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${t.paymentMethod === 'cash' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
                            {t.paymentMethod.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Payment Modal */}
      <Dialog open={paymentModal} onOpenChange={setPaymentModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Select Payment Method</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button onClick={() => handlePayment('cash')} className="h-20 flex-col gap-2" variant="outline">
              <Banknote className="w-6 h-6" /> Cash
            </Button>
            <Button onClick={() => handlePayment('fonepay')} className="h-20 flex-col gap-2 gradient-primary">
              <CreditCard className="w-6 h-6" /> Fonepay
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
