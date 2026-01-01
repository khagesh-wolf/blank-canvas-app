import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Printer, Plug, Unplug, Check, AlertCircle, Loader2 } from 'lucide-react';
import { dualPrinter } from '@/lib/dualPrinter';
import { receiptPrinter } from '@/lib/receiptPrinter';
import { toast } from 'sonner';
import { useStore } from '@/store/useStore';

interface PrinterConnectionUIProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PrinterConnectionUI({ open, onOpenChange }: PrinterConnectionUIProps) {
  const { settings } = useStore();
  const [kitchenConnected, setKitchenConnected] = useState(false);
  const [barConnected, setBarConnected] = useState(false);
  const [receiptConnected, setReceiptConnected] = useState(false);
  const [connecting, setConnecting] = useState<'kitchen' | 'bar' | 'receipt' | null>(null);

  const isWebUSBSupported = dualPrinter.isSupported();

  // Update connection status on open
  useEffect(() => {
    if (open) {
      const status = dualPrinter.getStatus();
      setKitchenConnected(status.kitchen);
      setBarConnected(status.bar);
      setReceiptConnected(receiptPrinter.isConnected());
    }
  }, [open]);

  const handleConnectKitchen = async () => {
    if (!isWebUSBSupported) {
      toast.error('Web USB is not supported in this browser');
      return;
    }

    setConnecting('kitchen');
    try {
      const success = await dualPrinter.connectKitchenPrinter();
      if (success) {
        setKitchenConnected(true);
        toast.success('Kitchen printer connected');
      } else {
        toast.error('Failed to connect kitchen printer');
      }
    } catch (error) {
      console.error('Kitchen printer connection error:', error);
      toast.error('Connection cancelled or failed');
    }
    setConnecting(null);
  };

  const handleConnectBar = async () => {
    if (!isWebUSBSupported) {
      toast.error('Web USB is not supported in this browser');
      return;
    }

    setConnecting('bar');
    try {
      const success = await dualPrinter.connectBarPrinter();
      if (success) {
        setBarConnected(true);
        toast.success('Bar printer connected');
      } else {
        toast.error('Failed to connect bar printer');
      }
    } catch (error) {
      console.error('Bar printer connection error:', error);
      toast.error('Connection cancelled or failed');
    }
    setConnecting(null);
  };

  const handleConnectReceipt = async () => {
    if (!isWebUSBSupported) {
      toast.error('Web USB is not supported in this browser');
      return;
    }

    setConnecting('receipt');
    try {
      await receiptPrinter.connect();
      setReceiptConnected(true);
      toast.success('Receipt printer connected');
    } catch (error) {
      console.error('Receipt printer connection error:', error);
      toast.error('Connection cancelled or failed');
    }
    setConnecting(null);
  };

  const handleTestPrint = async (printer: 'kitchen' | 'bar' | 'receipt') => {
    try {
      if (printer === 'kitchen' && kitchenConnected) {
        await dualPrinter.kitchenPrinter.printKOT({
          restaurantName: settings.restaurantName || 'Test',
          tableNumber: 0,
          orderId: 'TEST',
          time: new Date().toLocaleTimeString(),
          items: [{ name: 'Test Item', qty: 1 }],
          printerLabel: 'KITCHEN TEST'
        });
        toast.success('Kitchen test print sent');
      } else if (printer === 'bar' && barConnected) {
        await dualPrinter.barPrinter.printKOT({
          restaurantName: settings.restaurantName || 'Test',
          tableNumber: 0,
          orderId: 'TEST',
          time: new Date().toLocaleTimeString(),
          items: [{ name: 'Test Item', qty: 1 }],
          printerLabel: 'BAR TEST'
        });
        toast.success('Bar test print sent');
      } else if (printer === 'receipt' && receiptConnected) {
        await receiptPrinter.printTest();
        toast.success('Receipt test print sent');
      }
    } catch (error) {
      console.error('Test print error:', error);
      toast.error('Test print failed');
    }
  };

  const handleDisconnectAll = async () => {
    await dualPrinter.disconnectAll();
    await receiptPrinter.disconnect();
    setKitchenConnected(false);
    setBarConnected(false);
    setReceiptConnected(false);
    toast.info('All printers disconnected');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            Printer Connections
          </DialogTitle>
          <DialogDescription>
            Connect your thermal printers via USB for automatic order printing.
          </DialogDescription>
        </DialogHeader>

        {!isWebUSBSupported ? (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Web USB Not Supported</p>
              <p className="text-xs mt-1">Use Chrome or Edge browser on desktop for USB printer support.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Kitchen Printer */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  kitchenConnected ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'
                }`}>
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Kitchen Printer</p>
                  <p className="text-xs text-muted-foreground">
                    {kitchenConnected ? 'Connected' : 'Not connected'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {kitchenConnected && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleTestPrint('kitchen')}
                    className="h-8 text-xs"
                  >
                    Test
                  </Button>
                )}
                <Button
                  size="sm"
                  variant={kitchenConnected ? 'outline' : 'default'}
                  onClick={handleConnectKitchen}
                  disabled={connecting !== null}
                  className="h-8"
                >
                  {connecting === 'kitchen' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : kitchenConnected ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Plug className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Bar Printer - Only show if dual printer is enabled */}
            {settings.dualPrinterEnabled && (
              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    barConnected ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'
                  }`}>
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Bar Printer</p>
                    <p className="text-xs text-muted-foreground">
                      {barConnected ? 'Connected' : 'Not connected'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {barConnected && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleTestPrint('bar')}
                      className="h-8 text-xs"
                    >
                      Test
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant={barConnected ? 'outline' : 'default'}
                    onClick={handleConnectBar}
                    disabled={connecting !== null}
                    className="h-8"
                  >
                    {connecting === 'bar' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : barConnected ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Plug className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Receipt Printer */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  receiptConnected ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'
                }`}>
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Receipt Printer</p>
                  <p className="text-xs text-muted-foreground">
                    {receiptConnected ? 'Connected' : 'Not connected'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {receiptConnected && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleTestPrint('receipt')}
                    className="h-8 text-xs"
                  >
                    Test
                  </Button>
                )}
                <Button
                  size="sm"
                  variant={receiptConnected ? 'outline' : 'default'}
                  onClick={handleConnectReceipt}
                  disabled={connecting !== null}
                  className="h-8"
                >
                  {connecting === 'receipt' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : receiptConnected ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Plug className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Info text */}
            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <p className="font-medium mb-1">How to connect:</p>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>Plug in your USB thermal printer</li>
                <li>Click the connect button above</li>
                <li>Select your printer from the browser popup</li>
                <li>Use "Test" to verify the connection</li>
              </ol>
            </div>
          </div>
        )}

        <DialogFooter className="flex-row gap-2 sm:justify-between">
          {(kitchenConnected || barConnected || receiptConnected) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisconnectAll}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Unplug className="w-4 h-4 mr-1" />
              Disconnect All
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} className="ml-auto">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
