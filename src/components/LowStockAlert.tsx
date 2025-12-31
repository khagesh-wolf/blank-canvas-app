import { useStore } from '@/store/useStore';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface LowStockAlertProps {
  compact?: boolean;
}

export function LowStockAlert({ compact = false }: LowStockAlertProps) {
  const { lowStockItems, refreshLowStockItems } = useStore();

  // Refresh low stock items on mount
  useStore.getState().refreshLowStockItems();

  if (lowStockItems.length === 0) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-warning/15 text-warning rounded-lg border border-warning/20 animate-pulse-soft">
        <AlertTriangle className="w-4 h-4" />
        <span className="text-sm font-medium">{lowStockItems.length} Low Stock</span>
      </div>
    );
  }

  return (
    <div className="bg-warning/10 border border-warning/20 rounded-xl p-3 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-5 h-5 text-warning" />
        <span className="font-semibold text-warning">Low Stock Alert</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {lowStockItems.slice(0, 5).map(item => (
          <Badge key={item.inventoryItemId} variant="outline" className="bg-warning/20 text-warning border-warning/30 text-xs">
            {item.menuItemName}: {item.currentStock} {item.unit}
          </Badge>
        ))}
        {lowStockItems.length > 5 && (
          <Badge variant="outline" className="bg-warning/20 text-warning border-warning/30 text-xs">
            +{lowStockItems.length - 5} more
          </Badge>
        )}
      </div>
    </div>
  );
}
