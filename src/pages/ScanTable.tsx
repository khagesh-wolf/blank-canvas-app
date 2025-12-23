import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { QrCode, Download, ArrowRight, Smartphone } from 'lucide-react';

export default function ScanTable() {
  const navigate = useNavigate();
  const { settings } = useStore();
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

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
    
    // Show install prompt if installable and not already shown recently
    const lastPrompt = localStorage.getItem('chiyadani:installPromptShown');
    const shouldShowPrompt = isInstallable && !isInstalled && 
      (!lastPrompt || Date.now() - parseInt(lastPrompt) > 24 * 60 * 60 * 1000);
    
    if (shouldShowPrompt) {
      setTimeout(() => setShowInstallPrompt(true), 1000);
    }
  }, [navigate, isInstallable, isInstalled]);

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      localStorage.setItem('chiyadani:installPromptShown', Date.now().toString());
      setShowInstallPrompt(false);
    }
  };

  const dismissInstall = () => {
    localStorage.setItem('chiyadani:installPromptShown', Date.now().toString());
    setShowInstallPrompt(false);
  };

  // Check if running as PWA
  const isPWA = window.matchMedia('(display-mode: standalone)').matches;

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

      {/* PWA Info */}
      {isPWA && (
        <div className="mt-6 px-4 py-2 bg-green-500/20 rounded-full text-green-400 text-sm flex items-center gap-2">
          <Download className="w-4 h-4" />
          App installed successfully!
        </div>
      )}

      {/* Install Prompt Modal */}
      {showInstallPrompt && (
        <>
          <div 
            className="fixed inset-0 bg-black/60 z-50"
            onClick={dismissInstall}
          />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 z-50 animate-slide-up safe-area-bottom">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🍵</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Install {settings.restaurantName}</h3>
                <p className="text-gray-600 text-sm">
                  Add to home screen for faster ordering and offline access!
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6 text-center">
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-2xl mb-1">⚡</div>
                <div className="text-xs text-gray-600">Faster</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-2xl mb-1">📶</div>
                <div className="text-xs text-gray-600">Offline</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-2xl mb-1">🔔</div>
                <div className="text-xs text-gray-600">Updates</div>
              </div>
            </div>

            <button
              onClick={handleInstall}
              className="w-full bg-black text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 mb-3"
            >
              <Download className="w-5 h-5" />
              Install App
            </button>
            
            <button
              onClick={dismissInstall}
              className="w-full text-gray-500 py-2 text-sm"
            >
              Maybe later
            </button>
          </div>
        </>
      )}

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        .safe-area-bottom {
          padding-bottom: max(1.5rem, env(safe-area-inset-bottom));
        }
      `}</style>
    </div>
  );
}
