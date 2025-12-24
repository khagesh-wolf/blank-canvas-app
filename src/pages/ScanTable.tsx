import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { QrCode, Smartphone } from 'lucide-react';

export default function ScanTable() {
  const navigate = useNavigate();
  const { settings } = useStore();

  // Check for existing session
  useEffect(() => {
    const sessionKey = 'chiyadani:customerActiveSession';
    const phoneKey = 'chiyadani:customerPhone';
    const existingSession = localStorage.getItem(sessionKey);
    const savedPhone = localStorage.getItem(phoneKey);
    
    if (existingSession) {
      try {
        const session = JSON.parse(existingSession) as { 
          table: number; 
          phone?: string; 
          tableTimestamp?: number;
          timestamp: number 
        };
        
        // Check if table session is still valid (4 hours)
        const tableTimestamp = session.tableTimestamp || session.timestamp;
        const tableAge = Date.now() - tableTimestamp;
        const isTableExpired = tableAge > 4 * 60 * 60 * 1000; // 4 hours
        
        if (!isTableExpired && session.table) {
          // Table session still valid, redirect to table
          navigate(`/table/${session.table}`);
          return;
        }
        
        // Table expired but phone might still be saved
        if (savedPhone) {
          // Keep the phone, just need to scan table again
          localStorage.setItem(phoneKey, savedPhone);
        }
        
        // Clear expired table session
        localStorage.removeItem(sessionKey);
      } catch {
        localStorage.removeItem(sessionKey);
      }
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 flex flex-col items-center justify-center p-6 text-white">
      {/* Logo */}
      <div className="mb-8 text-center">
        {settings.logo ? (
          <img 
            src={settings.logo} 
            alt={settings.restaurantName} 
            className="w-20 h-20 rounded-2xl object-cover mx-auto mb-4 shadow-2xl"
          />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center mx-auto mb-4 shadow-2xl">
            <span className="text-4xl">🍵</span>
          </div>
        )}
        <h1 className="text-3xl font-bold tracking-tight">{settings.restaurantName}</h1>
        <p className="text-gray-400 mt-1">Digital Menu</p>
      </div>

      {/* Main Card */}
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 max-w-sm w-full text-center border border-white/10">
        <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-white/10 flex items-center justify-center">
          <QrCode className="w-12 h-12 text-amber-400" />
        </div>
        
        <h2 className="text-xl font-semibold mb-2">Scan Table QR Code</h2>
        <p className="text-gray-400 text-sm mb-6">
          Please scan the QR code on your table to start ordering delicious food and drinks.
        </p>

        <div className="flex items-center justify-center gap-2 text-amber-400 text-sm">
          <Smartphone className="w-4 h-4" />
          <span>Use your camera app to scan</span>
        </div>
      </div>
    </div>
  );
}
