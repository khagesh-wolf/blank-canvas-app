import { Link } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Coffee, User, ChefHat, CreditCard, Settings, TrendingUp, Users, ShoppingBag } from 'lucide-react';
import { formatNepalDateTime } from '@/lib/nepalTime';

const modules = [
  {
    path: '/kitchen',
    title: 'Kitchen Display',
    description: 'Live orders for cooking staff',
    icon: ChefHat,
    color: 'from-orange-500 to-amber-500',
  },
  {
    path: '/counter',
    title: 'Counter POS',
    description: 'Billing and payments',
    icon: CreditCard,
    color: 'from-emerald-500 to-green-500',
  },
  {
    path: '/admin',
    title: 'Admin Dashboard',
    description: 'Menu, analytics & settings',
    icon: Settings,
    color: 'from-blue-500 to-violet-500',
  },
];

export default function Index() {
  const { settings, isAuthenticated, currentUser, getTodayStats, getPendingOrders } = useStore();
  const stats = getTodayStats();
  const pendingOrders = getPendingOrders();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
              <Coffee className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl">{settings.restaurantName}</span>
          </div>
          
          {isAuthenticated && currentUser ? (
            <Link to={currentUser.role === 'admin' ? '/admin' : '/counter'}>
              <Button variant="outline" size="sm">
                {currentUser.name}
              </Button>
            </Link>
          ) : (
            <Link to="/auth">
              <Button size="sm" className="gradient-primary">
                <User className="w-4 h-4 mr-2" /> Staff Login
              </Button>
            </Link>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Hero */}
        <div className="gradient-primary rounded-2xl p-8 mb-8 text-white">
          <div className="flex items-center gap-4 mb-2">
            <Coffee className="w-10 h-10" />
            <div>
              <h1 className="text-3xl font-bold">{settings.restaurantName}</h1>
              <p className="text-white/80">Tea Restaurant Management Portal</p>
            </div>
          </div>
          <p className="text-sm text-white/60 mt-4">{formatNepalDateTime(new Date())} • Nepal Time</p>
          
          {pendingOrders.length > 0 && (
            <div className="mt-4 bg-white/10 rounded-lg px-4 py-2 inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
              <span className="font-medium">{pendingOrders.length} pending orders waiting</span>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={TrendingUp} label="Today's Revenue" value={`रू ${stats.revenue}`} />
          <StatCard icon={ShoppingBag} label="Orders Completed" value={stats.orders.toString()} />
          <StatCard icon={ChefHat} label="Active Orders" value={stats.activeOrders.toString()} highlight={stats.activeOrders > 0} />
          <StatCard icon={Users} label="Active Tables" value={stats.activeTables.toString()} />
        </div>

        {/* Quick Access */}
        <h2 className="text-2xl font-bold mb-4">Quick Access</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.path}
                to={module.path}
                className="bg-card rounded-2xl border border-border p-6 hover:shadow-lg hover:-translate-y-1 transition-all"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${module.color} flex items-center justify-center mb-4`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">{module.title}</h3>
                <p className="text-muted-foreground text-sm">{module.description}</p>
              </Link>
            );
          })}
        </div>

        {/* Customer Info */}
        <div className="mt-12 bg-muted rounded-2xl p-6 text-center">
          <h3 className="font-bold mb-2">For Customers</h3>
          <p className="text-muted-foreground text-sm">
            Scan the QR code at your table to place an order directly from your phone.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Tables 1 - {settings.tableCount} available
          </p>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-muted-foreground text-sm">
          <p>{settings.restaurantName} v2.0</p>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, highlight }: { 
  icon: any; label: string; value: string; highlight?: boolean;
}) {
  return (
    <div className={`bg-card p-4 rounded-xl border ${highlight ? 'border-primary' : 'border-border'}`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className={`w-5 h-5 ${highlight ? 'text-primary' : 'text-muted-foreground'}`} />
      </div>
      <p className={`text-2xl font-bold ${highlight ? 'text-primary' : ''}`}>{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
