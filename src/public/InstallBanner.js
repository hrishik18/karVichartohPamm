import { useState, useEffect, useRef } from 'react';

const DISMISSED_KEY = 'kvtp-install-dismissed';
const DISMISS_DAYS = 14; // don't show again for 2 weeks after dismiss

export default function InstallBanner() {
  const [show, setShow] = useState(false);
  const deferredPrompt = useRef(null);

  useEffect(() => {
    // Don't show if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // Don't show if recently dismissed
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed && Date.now() - Number(dismissed) < DISMISS_DAYS * 86400000) return;

    const handler = (e) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    const prompt = deferredPrompt.current;
    if (!prompt) return;

    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    deferredPrompt.current = null;
    setShow(false);

    if (outcome === 'dismissed') {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-sm animate-slide-up">
      <div className="bg-secondary/95 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-xl shadow-black/30 flex items-center gap-3">
        {/* App icon */}
        <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
          <span className="text-2xl">🎵</span>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold">Install KVTP</p>
          <p className="text-gray-400 text-xs">
            Add to home screen for the best experience
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDismiss}
            className="text-gray-500 hover:text-gray-300 text-xs px-2 py-1 transition-colors"
            aria-label="Dismiss install prompt"
          >
            Later
          </button>
          <button
            onClick={handleInstall}
            className="bg-accent hover:bg-green-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Install
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
