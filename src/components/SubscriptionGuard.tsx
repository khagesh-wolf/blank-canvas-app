import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionLockScreen } from './SubscriptionLockScreen';
import { SubscriptionWarning } from './SubscriptionWarning';
import { Loader2 } from 'lucide-react';

interface SubscriptionGuardProps {
  children: ReactNode;
}

// Customer-facing routes where warning should not be shown
const CUSTOMER_ROUTES = ['/', '/table'];

function isCustomerRoute(pathname: string): boolean {
  return CUSTOMER_ROUTES.some(route => 
    pathname === route || pathname.startsWith('/table/')
  );
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { status, isLoading, isValid, showWarning, refresh } = useSubscription();

  // Show loading state on initial check
  if (isLoading && !status) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Verifying subscription...</p>
        </div>
      </div>
    );
  }

  // Show lock screen if subscription is invalid
  if (!isValid && status) {
    return (
      <SubscriptionLockScreen 
        status={status} 
        onRefresh={refresh}
        isRefreshing={isLoading}
      />
    );
  }

  // Render children - warning will be conditionally shown inside
  return (
    <SubscriptionGuardInner showWarning={showWarning} status={status}>
      {children}
    </SubscriptionGuardInner>
  );
}

// Inner component that can use useLocation (inside BrowserRouter)
function SubscriptionGuardInner({ 
  children, 
  showWarning, 
  status 
}: { 
  children: ReactNode; 
  showWarning: boolean; 
  status: ReturnType<typeof useSubscription>['status'];
}) {
  // We can't use useLocation here because SubscriptionGuard is outside BrowserRouter
  // Instead, check window.location directly
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  const hideWarning = isCustomerRoute(pathname);
  const shouldShowWarning = showWarning && status && !hideWarning;

  return (
    <>
      {shouldShowWarning && <SubscriptionWarning status={status} />}
      <div className={shouldShowWarning ? 'pt-10' : ''}>
        {children}
      </div>
    </>
  );
}
