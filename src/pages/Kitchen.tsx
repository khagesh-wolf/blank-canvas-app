import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { Order, OrderStatus } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Check, X, Clock, ChefHat, Bell, CheckCircle, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { formatNepalTime, formatNepalDateTime } from '@/lib/nepalTime';

const statusFlow: OrderStatus[] = ['pending', 'accepted', 'preparing', 'ready', 'served'];

export default function Kitchen() {
  const navigate = useNavigate();
  const { orders, updateOrderStatus, isAuthenticated, logout, settings } = useStore();
  const [filter, setFilter] = useState<'all' | OrderStatus>('all');

  if (!isAuthenticated) {
    navigate('/auth');
    return null;
  }

  const activeOrders = orders.filter(o => 
    ['pending', 'accepted', 'preparing', 'ready'].includes(o.status)
  );

  const filteredOrders = filter === 'all' 
    ? activeOrders 
    : activeOrders.filter(o => o.status === filter);

  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const preparingCount = orders.filter(o => o.status === 'preparing').length;
  const readyCount = orders.filter(o => o.status === 'ready').length;

  const handleStatusChange = (order: Order, newStatus: OrderStatus) => {
    updateOrderStatus(order.id, newStatus);
    toast.success(`Order marked as ${newStatus}`);
  };

  const getNextStatus = (current: OrderStatus): OrderStatus | null => {
    const idx = statusFlow.indexOf(current);
    return idx >= 0 && idx < statusFlow.length - 1 ? statusFlow[idx + 1] : null;
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ChefHat className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">{settings.restaurantName} - Kitchen</h1>
            <p className="text-sm text-muted-foreground">{formatNepalDateTime(new Date())}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {pendingCount > 0 && (
            <span className="bg-warning text-warning-foreground px-3 py-1 rounded-full text-sm font-medium">
              {pendingCount} pending
            </span>
          )}
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="p-6">
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <FilterTab label="All Orders" count={activeOrders.length} active={filter === 'all'} onClick={() => setFilter('all')} />
          <FilterTab label="Pending" count={pendingCount} active={filter === 'pending'} onClick={() => setFilter('pending')} variant="warning" />
          <FilterTab label="Preparing" count={preparingCount} active={filter === 'preparing'} onClick={() => setFilter('preparing')} variant="accent" />
          <FilterTab label="Ready" count={readyCount} active={filter === 'ready'} onClick={() => setFilter('ready')} variant="success" />
        </div>

        {/* Orders Grid */}
        {filteredOrders.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-12 text-center">
            <ChefHat className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground">No active orders</h3>
            <p className="text-muted-foreground/70 mt-1">New orders will appear here automatically</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredOrders.map((order) => (
              <OrderCard 
                key={order.id} 
                order={order}
                onStatusChange={handleStatusChange}
                nextStatus={getNextStatus(order.status)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterTab({ 
  label, count, active, onClick, variant = 'default'
}: { 
  label: string; count: number; active: boolean; onClick: () => void;
  variant?: 'default' | 'warning' | 'accent' | 'success';
}) {
  const variantClasses = {
    default: active ? 'gradient-primary text-white' : 'bg-muted text-muted-foreground',
    warning: active ? 'bg-warning text-warning-foreground' : 'bg-warning/20 text-warning',
    accent: active ? 'bg-secondary text-secondary-foreground' : 'bg-secondary/20 text-secondary',
    success: active ? 'bg-success text-success-foreground' : 'bg-success/20 text-success',
  };

  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${variantClasses[variant]}`}>
      {label}
      <span className={`px-2 py-0.5 rounded-full text-xs ${active ? 'bg-white/20' : 'bg-background/50'}`}>{count}</span>
    </button>
  );
}

function OrderCard({ order, onStatusChange, nextStatus }: { 
  order: Order; 
  onStatusChange: (order: Order, status: OrderStatus) => void;
  nextStatus: OrderStatus | null;
}) {
  const statusIcons = {
    pending: Clock,
    accepted: ChefHat,
    preparing: ChefHat,
    ready: Bell,
    served: CheckCircle,
  };

  const StatusIcon = statusIcons[order.status as keyof typeof statusIcons] || Clock;

  return (
    <div className={`bg-card rounded-xl border overflow-hidden animate-slide-up ${order.status === 'pending' ? 'border-warning' : 'border-border'}`}>
      <div className={`p-4 border-b border-border ${order.status === 'pending' ? 'bg-warning/10' : ''}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <StatusIcon className={`w-5 h-5 ${order.status === 'pending' ? 'text-warning' : 'text-muted-foreground'}`} />
            <span className="font-bold text-lg">Table {order.tableNumber}</span>
          </div>
          <StatusBadge status={order.status} />
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{order.customerPhone}</span>
          <span>{formatNepalTime(order.createdAt)}</span>
        </div>
      </div>

      <div className="p-4 space-y-2">
        {order.items.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center">
            <span className="font-medium"><span className="text-primary font-bold">{item.qty}x</span> {item.name}</span>
          </div>
        ))}
        {order.notes && <p className="text-xs text-muted-foreground bg-muted p-2 rounded mt-2">{order.notes}</p>}
      </div>

      <div className="p-4 pt-0 flex gap-2">
        {order.status === 'pending' && (
          <>
            <Button size="sm" className="flex-1 bg-success hover:bg-success/90" onClick={() => onStatusChange(order, 'accepted')}>
              <Check className="w-4 h-4 mr-1" /> Accept
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onStatusChange(order, 'cancelled')}>
              <X className="w-4 h-4" />
            </Button>
          </>
        )}
        {nextStatus && order.status !== 'pending' && (
          <Button size="sm" className="w-full" onClick={() => onStatusChange(order, nextStatus)}>
            Mark as {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
          </Button>
        )}
      </div>

      <div className="px-4 pb-3 text-xs text-muted-foreground/50">ID: #{order.id.slice(-6)}</div>
    </div>
  );
}
