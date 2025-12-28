/**
 * Kitchen Order Ticket (KOT) Printing
 * Prints KOT when waiter sends an order (if enabled in settings)
 */

import { receiptPrinter } from './receiptPrinter';
import { Order } from '@/types';

export interface KOTData {
  restaurantName: string;
  tableNumber: number;
  orderId: string;
  time: string;
  items: Array<{
    name: string;
    qty: number;
  }>;
  notes?: string;
  waiterName?: string;
}

class KOTPrinter {
  // Format and print a Kitchen Order Ticket
  async printKOT(data: KOTData): Promise<boolean> {
    if (!receiptPrinter.isSupported()) {
      console.log('Web USB not supported - KOT printing unavailable');
      return false;
    }

    if (!receiptPrinter.isConnected()) {
      console.log('Printer not connected - attempting to connect...');
      try {
        await receiptPrinter.connect();
      } catch (error) {
        console.error('Failed to connect to printer:', error);
        return false;
      }
    }

    try {
      // For now, we'll format KOT as a simple receipt
      // In a full implementation, this would use specific KOT formatting
      const kotContent = this.formatKOT(data);
      console.log('KOT Content:', kotContent);
      
      // Note: Full implementation would send ESC/POS commands
      // For demo, we log the content
      console.log('='.repeat(32));
      console.log('       KITCHEN ORDER TICKET');
      console.log('='.repeat(32));
      console.log(`Table: ${data.tableNumber}`);
      console.log(`Time: ${data.time}`);
      console.log(`Order: #${data.orderId}`);
      if (data.waiterName) {
        console.log(`Waiter: ${data.waiterName}`);
      }
      console.log('-'.repeat(32));
      data.items.forEach(item => {
        console.log(`${item.qty}x ${item.name}`);
      });
      if (data.notes) {
        console.log('-'.repeat(32));
        console.log(`Notes: ${data.notes}`);
      }
      console.log('='.repeat(32));
      
      return true;
    } catch (error) {
      console.error('Failed to print KOT:', error);
      return false;
    }
  }

  private formatKOT(data: KOTData): string {
    let content = '';
    content += `${'='.repeat(32)}\n`;
    content += `       KITCHEN ORDER TICKET\n`;
    content += `${'='.repeat(32)}\n`;
    content += `Table: ${data.tableNumber}\n`;
    content += `Time: ${data.time}\n`;
    content += `Order: #${data.orderId}\n`;
    if (data.waiterName) {
      content += `Waiter: ${data.waiterName}\n`;
    }
    content += `${'-'.repeat(32)}\n`;
    
    data.items.forEach(item => {
      content += `${item.qty}x ${item.name}\n`;
    });
    
    if (data.notes) {
      content += `${'-'.repeat(32)}\n`;
      content += `Notes: ${data.notes}\n`;
    }
    
    content += `${'='.repeat(32)}\n`;
    return content;
  }
}

export const kotPrinter = new KOTPrinter();

// Helper function to print KOT from an Order
export async function printKOTFromOrder(order: Order, restaurantName: string, waiterName?: string): Promise<boolean> {
  const kotData: KOTData = {
    restaurantName,
    tableNumber: order.tableNumber,
    orderId: order.id.slice(-6),
    time: new Date(order.createdAt).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }),
    items: order.items.map(item => ({
      name: item.name,
      qty: item.qty
    })),
    notes: order.notes,
    waiterName
  };

  return kotPrinter.printKOT(kotData);
}

// Browser notification for KOT (fallback when printer not available)
export function showKOTNotification(order: Order) {
  if ('Notification' in window && Notification.permission === 'granted') {
    const itemsList = order.items.map(i => `${i.qty}x ${i.name}`).join(', ');
    new Notification(`New Order - Table ${order.tableNumber}`, {
      body: itemsList,
      icon: '/pwa-192x192.png',
      tag: `kot-${order.id}`,
      requireInteraction: true
    });
  }
}
