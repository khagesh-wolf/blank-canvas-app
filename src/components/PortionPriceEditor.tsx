import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { PortionOption, MenuItem } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Save, X } from 'lucide-react';

interface PortionPriceEditorProps {
  menuItem: MenuItem;
  portions: PortionOption[];
  open: boolean;
  onClose: () => void;
}

export function PortionPriceEditor({ menuItem, portions, open, onClose }: PortionPriceEditorProps) {
  const { setItemPortionPrice, getItemPortionPrice, inventoryCategories } = useStore();
  
  // Find the inventory category for unit display
  const category = useStore(state => state.categories.find(c => c.name === menuItem.category));
  const invCat = inventoryCategories.find(ic => ic.categoryId === category?.id);
  
  // Local state for editing prices
  const [prices, setPrices] = useState<Record<string, string>>({});

  // Initialize prices from store when opening
  useEffect(() => {
    if (open) {
      const initial: Record<string, string> = {};
      portions.forEach(p => {
        const itemPrice = getItemPortionPrice(menuItem.id, p.id);
        initial[p.id] = itemPrice?.toString() || '';
      });
      setPrices(initial);
    }
  }, [open, menuItem.id, portions, getItemPortionPrice]);

  const handleSave = () => {
    let hasChanges = false;
    
    portions.forEach(portion => {
      const priceStr = prices[portion.id];
      const newPrice = priceStr ? parseFloat(priceStr) : null;
      const currentPrice = getItemPortionPrice(menuItem.id, portion.id);
      
      // Only update if price changed and has a valid value
      if (newPrice !== null && newPrice !== currentPrice) {
        setItemPortionPrice(menuItem.id, portion.id, newPrice);
        hasChanges = true;
      }
    });

    if (hasChanges) {
      toast.success(`Prices updated for ${menuItem.name}`);
    }
    onClose();
  };

  const handlePriceChange = (portionId: string, value: string) => {
    setPrices(prev => ({ ...prev, [portionId]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Set Prices: {menuItem.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-muted-foreground">
            Set the price for each portion size of this item.
          </p>
          
          {portions
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map(portion => {
              const hasPrice = prices[portion.id] !== '';
              return (
                <div key={portion.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex-1">
                    <div className="font-medium">{portion.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {portion.size} {invCat?.unitType || 'units'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Rs</span>
                    <Input
                      type="number"
                      value={prices[portion.id]}
                      onChange={(e) => handlePriceChange(portion.id, e.target.value)}
                      placeholder="Price"
                      className="w-24"
                    />
                  </div>
                  {hasPrice && (
                    <Badge variant="secondary" className="text-xs">Set</Badge>
                  )}
                </div>
              );
            })}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" /> Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" /> Save Prices
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Category-wide portion editor - for setting up portion sizes (not prices)
interface CategoryPortionEditorProps {
  categoryId: string;
  categoryName: string;
  open: boolean;
  onClose: () => void;
}

export function CategoryPortionEditor({ categoryId, categoryName, open, onClose }: CategoryPortionEditorProps) {
  const { menuItems, portionOptions, inventoryCategories } = useStore();
  
  const invCat = inventoryCategories.find(ic => ic.categoryId === categoryId);
  const portions = portionOptions.filter(p => p.inventoryCategoryId === invCat?.id);
  const itemsInCategory = menuItems.filter(m => m.category === categoryName);
  
  // State for selected item to edit prices
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  return (
    <>
      <Dialog open={open && !selectedItem} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Portion Prices: {categoryName}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select an item to set its portion prices. Each item can have different prices for the same portion sizes.
            </p>
            
            {/* Portion sizes info */}
            {portions.length > 0 && (
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-sm font-medium mb-2">Available Portions:</div>
                <div className="flex flex-wrap gap-2">
                  {portions.sort((a, b) => a.sortOrder - b.sortOrder).map(p => (
                    <Badge key={p.id} variant="outline">
                      {p.name} ({p.size} {invCat?.unitType})
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Items list */}
            <div className="space-y-2">
              {itemsInCategory.map(item => (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 hover:border-primary/50 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    {item.image && (
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    )}
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Base: Rs {item.price}
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary">Set Prices →</Badge>
                </button>
              ))}
              
              {itemsInCategory.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No items in this category
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={onClose}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Per-item price editor */}
      {selectedItem && (
        <PortionPriceEditor
          menuItem={selectedItem}
          portions={portions}
          open={!!selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </>
  );
}

// Keep backward compatibility - export the old name
export { CategoryPortionEditor as CategoryPriceEditor };
