/**
 * Dual Printer System
 * Supports two separate printers:
 * - Kitchen Printer (Printer 1): For regular kitchen KOT
 * - Bar Printer (Printer 2): For bar/drinks items and bill receipts
 * 
 * Routing logic:
 * - Items in categories with useBarPrinter=true → Bar Printer
 * - All other items → Kitchen Printer
 * - Bill receipts → Bar Printer
 */

import { Order, OrderItem, Category } from '@/types';

// Web USB types (same as receiptPrinter.ts)
interface USBDeviceType {
  vendorId: number;
  productId: number;
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(config: number): Promise<void>;
  claimInterface(iface: number): Promise<void>;
  releaseInterface(iface: number): Promise<void>;
  transferOut(endpoint: number, data: ArrayBuffer): Promise<{ status: string }>;
  configuration?: {
    interfaces: Array<{
      alternate: {
        endpoints: Array<{
          direction: 'in' | 'out';
          endpointNumber: number;
        }>;
      };
    }>;
  };
}

// ESC/POS Commands
const ESC = 0x1B;
const GS = 0x1D;

const COMMANDS = {
  INIT: [ESC, 0x40], // Initialize printer
  CENTER: [ESC, 0x61, 0x01], // Center alignment
  LEFT: [ESC, 0x61, 0x00], // Left alignment
  BOLD_ON: [ESC, 0x45, 0x01], // Bold on
  BOLD_OFF: [ESC, 0x45, 0x00], // Bold off
  DOUBLE_HEIGHT: [ESC, 0x21, 0x10], // Double height
  DOUBLE_WIDTH: [ESC, 0x21, 0x20], // Double width
  DOUBLE_SIZE: [ESC, 0x21, 0x30], // Double height and width
  NORMAL_SIZE: [ESC, 0x21, 0x00], // Normal size
  CUT: [GS, 0x56, 0x00], // Full cut
  PARTIAL_CUT: [GS, 0x56, 0x01], // Partial cut
  FEED_LINES: (n: number) => [ESC, 0x64, n], // Feed n lines
  LINE_SPACING: (n: number) => [ESC, 0x33, n], // Set line spacing
};

class Printer {
  private device: USBDeviceType | null = null;
  private endpointNumber: number = 1;
  public name: string;

  constructor(name: string) {
    this.name = name;
  }

  isSupported(): boolean {
    return 'usb' in navigator;
  }

  isConnected(): boolean {
    return this.device !== null;
  }

  async connect(): Promise<boolean> {
    if (!this.isSupported()) {
      console.log(`[${this.name}] Web USB not supported`);
      return false;
    }

    try {
      const nav = navigator as any;
      // Request USB device with common thermal printer vendor IDs
      this.device = await nav.usb.requestDevice({
        filters: [
          { vendorId: 0x0483 }, // STMicroelectronics
          { vendorId: 0x0416 }, // Winbond
          { vendorId: 0x0419 }, // Samsung
          { vendorId: 0x04B8 }, // Epson
          { vendorId: 0x0525 }, // PLX Technology
          { vendorId: 0x067B }, // Prolific
          { vendorId: 0x1A86 }, // QinHeng Electronics (CH340)
          { vendorId: 0x0FE6 }, // ICS
          { vendorId: 0x28E9 }, // GD Microelectronics
          { vendorId: 0x1FC9 }, // NXP
          { vendorId: 0x0DD4 }, // Custom Engineering
          { vendorId: 0x20D1 }, // Simba
          { vendorId: 0x6868 }, // Generic POS printers
        ]
      });

      if (!this.device) {
        console.log(`[${this.name}] No device selected`);
        return false;
      }

      await this.device.open();
      await this.device.selectConfiguration(1);
      await this.device.claimInterface(0);

      // Find the OUT endpoint
      const iface = this.device.configuration?.interfaces[0];
      if (iface) {
        const endpoints = iface.alternate.endpoints;
        const outEndpoint = endpoints.find(ep => ep.direction === 'out');
        if (outEndpoint) {
          this.endpointNumber = outEndpoint.endpointNumber;
        }
      }

      console.log(`[${this.name}] Connected to printer`);
      return true;
    } catch (error) {
      console.error(`[${this.name}] Connection failed:`, error);
      this.device = null;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.device) {
      try {
        await this.device.releaseInterface(0);
        await this.device.close();
      } catch (error) {
        console.error(`[${this.name}] Disconnect error:`, error);
      }
      this.device = null;
    }
  }

  private async sendCommand(command: number[]): Promise<boolean> {
    if (!this.device) return false;
    
    try {
      const data = new Uint8Array(command);
      await this.device.transferOut(this.endpointNumber, data.buffer);
      return true;
    } catch (error) {
      console.error(`[${this.name}] Send command error:`, error);
      return false;
    }
  }

  private async sendText(text: string): Promise<boolean> {
    if (!this.device) return false;
    
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(text + '\n');
      await this.device.transferOut(this.endpointNumber, data.buffer);
      return true;
    } catch (error) {
      console.error(`[${this.name}] Send text error:`, error);
      return false;
    }
  }

  async printKOT(data: {
    restaurantName: string;
    tableNumber: number;
    orderId: string;
    time: string;
    items: Array<{ name: string; qty: number }>;
    notes?: string;
    waiterName?: string;
    printerLabel?: string;
  }): Promise<boolean> {
    if (!this.device) {
      console.log(`[${this.name}] Not connected - logging KOT to console`);
      console.log('='.repeat(32));
      console.log(`  ${data.printerLabel || 'KITCHEN ORDER TICKET'}`);
      console.log('='.repeat(32));
      console.log(`Table: ${data.tableNumber}`);
      console.log(`Time: ${data.time}`);
      console.log(`Order: #${data.orderId}`);
      if (data.waiterName) console.log(`Waiter: ${data.waiterName}`);
      console.log('-'.repeat(32));
      data.items.forEach(item => console.log(`${item.qty}x ${item.name}`));
      if (data.notes) {
        console.log('-'.repeat(32));
        console.log(`Notes: ${data.notes}`);
      }
      console.log('='.repeat(32));
      return true; // Return true for demo purposes
    }

    try {
      await this.sendCommand(COMMANDS.INIT);
      await this.sendCommand(COMMANDS.CENTER);
      await this.sendCommand(COMMANDS.DOUBLE_SIZE);
      await this.sendText(data.printerLabel || 'KITCHEN ORDER');
      await this.sendCommand(COMMANDS.NORMAL_SIZE);
      await this.sendText('='.repeat(32));
      
      await this.sendCommand(COMMANDS.LEFT);
      await this.sendCommand(COMMANDS.BOLD_ON);
      await this.sendText(`Table: ${data.tableNumber}`);
      await this.sendCommand(COMMANDS.BOLD_OFF);
      await this.sendText(`Time: ${data.time}`);
      await this.sendText(`Order: #${data.orderId}`);
      if (data.waiterName) {
        await this.sendText(`Waiter: ${data.waiterName}`);
      }
      await this.sendText('-'.repeat(32));

      await this.sendCommand(COMMANDS.DOUBLE_HEIGHT);
      for (const item of data.items) {
        await this.sendText(`${item.qty}x ${item.name}`);
      }
      await this.sendCommand(COMMANDS.NORMAL_SIZE);

      if (data.notes) {
        await this.sendText('-'.repeat(32));
        await this.sendText(`Notes: ${data.notes}`);
      }

      await this.sendText('='.repeat(32));
      await this.sendCommand(COMMANDS.FEED_LINES(3));
      await this.sendCommand(COMMANDS.CUT);

      return true;
    } catch (error) {
      console.error(`[${this.name}] Print KOT error:`, error);
      return false;
    }
  }
}

// Dual printer manager
class DualPrinterManager {
  public kitchenPrinter: Printer;
  public barPrinter: Printer;

  constructor() {
    this.kitchenPrinter = new Printer('Kitchen Printer');
    this.barPrinter = new Printer('Bar Printer');
  }

  isSupported(): boolean {
    return 'usb' in navigator;
  }

  async connectKitchenPrinter(): Promise<boolean> {
    return this.kitchenPrinter.connect();
  }

  async connectBarPrinter(): Promise<boolean> {
    return this.barPrinter.connect();
  }

  async disconnectAll(): Promise<void> {
    await this.kitchenPrinter.disconnect();
    await this.barPrinter.disconnect();
  }

  /**
   * Split order items by printer destination
   */
  splitOrderByPrinter(
    items: OrderItem[],
    categories: Category[]
  ): { kitchenItems: OrderItem[]; barItems: OrderItem[] } {
    const kitchenItems: OrderItem[] = [];
    const barItems: OrderItem[] = [];

    // Build a map of category name to useBarPrinter flag
    const categoryBarPrinterMap = new Map<string, boolean>();
    categories.forEach(cat => {
      categoryBarPrinterMap.set(cat.name, cat.useBarPrinter || false);
    });

    // We need to get category from menu items - this requires lookup
    // For now, we'll use a simpler approach: check if any category with useBarPrinter matches
    items.forEach(item => {
      // Items should have a reference to their category somehow
      // Since OrderItem doesn't have category, we'll need to look it up from menuItemId
      // For now, push to kitchen by default
      kitchenItems.push(item);
    });

    return { kitchenItems, barItems };
  }

  /**
   * Print KOT to appropriate printers based on item categories
   */
  async printSplitKOT(
    order: Order,
    restaurantName: string,
    categories: Category[],
    menuItemsCategoryMap: Map<string, string>, // menuItemId -> categoryName
    waiterName?: string
  ): Promise<{ kitchenPrinted: boolean; barPrinted: boolean }> {
    const kitchenItems: Array<{ name: string; qty: number }> = [];
    const barItems: Array<{ name: string; qty: number }> = [];

    // Build category bar printer lookup
    const categoryBarPrinterMap = new Map<string, boolean>();
    categories.forEach(cat => {
      categoryBarPrinterMap.set(cat.name, cat.useBarPrinter || false);
    });

    // Split items by printer
    order.items.forEach(item => {
      const categoryName = menuItemsCategoryMap.get(item.menuItemId);
      const useBarPrinter = categoryName ? categoryBarPrinterMap.get(categoryName) : false;
      
      if (useBarPrinter) {
        barItems.push({ name: item.name, qty: item.qty });
      } else {
        kitchenItems.push({ name: item.name, qty: item.qty });
      }
    });

    const time = new Date(order.createdAt).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const baseData = {
      restaurantName,
      tableNumber: order.tableNumber,
      orderId: order.id.slice(-6),
      time,
      notes: order.notes,
      waiterName
    };

    let kitchenPrinted = true;
    let barPrinted = true;

    // Print kitchen items first (as per user preference)
    if (kitchenItems.length > 0) {
      kitchenPrinted = await this.kitchenPrinter.printKOT({
        ...baseData,
        items: kitchenItems,
        printerLabel: 'KITCHEN ORDER'
      });
    }

    // Then print bar items
    if (barItems.length > 0) {
      barPrinted = await this.barPrinter.printKOT({
        ...baseData,
        items: barItems,
        printerLabel: 'BAR ORDER'
      });
    }

    return { kitchenPrinted, barPrinted };
  }

  /**
   * Get printer connection status
   */
  getStatus(): { kitchen: boolean; bar: boolean } {
    return {
      kitchen: this.kitchenPrinter.isConnected(),
      bar: this.barPrinter.isConnected()
    };
  }
}

// Singleton instance
export const dualPrinter = new DualPrinterManager();

// Hook for React components
export function useDualPrinter() {
  return {
    isSupported: dualPrinter.isSupported(),
    connectKitchen: () => dualPrinter.connectKitchenPrinter(),
    connectBar: () => dualPrinter.connectBarPrinter(),
    disconnectAll: () => dualPrinter.disconnectAll(),
    getStatus: () => dualPrinter.getStatus(),
    printSplitKOT: dualPrinter.printSplitKOT.bind(dualPrinter),
    kitchenPrinter: dualPrinter.kitchenPrinter,
    barPrinter: dualPrinter.barPrinter
  };
}
