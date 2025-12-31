import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { MenuItem, PortionOption } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface PortionSelectorProps {
  item: MenuItem;
  open: boolean;
  onClose: () => void;
  onSelect: (item: MenuItem, portion: PortionOption, price: number) => void;
}

export function PortionSelector({ item, open, onClose, onSelect }: PortionSelectorProps) {
  const { getPortionsByCategory, menuItems } = useStore();
  const portions = getPortionsByCategory(item.category);
  
  // Calculate price for each portion based on base price and multiplier
  // Base price is typically for the smallest portion (30ml = 0.5x multiplier)
  const getPortionPrice = (portion: PortionOption): number => {
    // Find the base multiplier (smallest portion)
    const baseMultiplier = Math.min(...portions.map(p => p.priceMultiplier));
    // Calculate base unit price
    const baseUnitPrice = item.price / baseMultiplier;
    // Calculate price for this portion
    return Math.round(baseUnitPrice * portion.priceMultiplier);
  };

  if (portions.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold">{item.name}</DialogTitle>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground">Select portion size</p>
        </DialogHeader>
        
        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {portions
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map(portion => {
              const price = getPortionPrice(portion);
              return (
                <button
                  key={portion.id}
                  onClick={() => {
                    onSelect(item, portion, price);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-muted/50 hover:border-primary/50 transition-all active:scale-[0.98]"
                >
                  <div className="text-left">
                    <div className="font-semibold text-foreground">{portion.name}</div>
                    <div className="text-xs text-muted-foreground">{portion.size} {item.category === 'Drinks' ? 'ml' : 'units'}</div>
                  </div>
                  <div className="text-lg font-bold text-primary">
                    Rs {price}
                  </div>
                </button>
              );
            })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
