import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

type Snackbar = { message: string; actionLabel?: string; onAction?: () => void } | null;
type Banner = { message: string } | null;

type NotificationContextType = {
  notifySnackbar: (s: { message: string; actionLabel?: string; onAction?: () => void; timeoutMs?: number }) => void;
  notifyBanner: (b: { message: string; timeoutMs?: number }) => void;
};

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [snackbar, setSnackbar] = useState<Snackbar>(null);
  const [banner, setBanner] = useState<Banner>(null);
  const [snackbarTimer, setSnackbarTimer] = useState<number | null>(null);
  const [bannerTimer, setBannerTimer] = useState<number | null>(null);

  const clearTimer = (id: number | null) => {
    if (id) window.clearTimeout(id);
  };

  const notifySnackbar = useCallback((s: { message: string; actionLabel?: string; onAction?: () => void; timeoutMs?: number }) => {
    setSnackbar({ message: s.message, actionLabel: s.actionLabel, onAction: s.onAction });
    clearTimer(snackbarTimer);
    const id = window.setTimeout(() => setSnackbar(null), s.timeoutMs ?? 3000);
    setSnackbarTimer(id);
  }, [snackbarTimer]);

  const notifyBanner = useCallback((b: { message: string; timeoutMs?: number }) => {
    setBanner({ message: b.message });
    clearTimer(bannerTimer);
    const id = window.setTimeout(() => setBanner(null), b.timeoutMs ?? 4000);
    setBannerTimer(id);
  }, [bannerTimer]);

  const value = useMemo(() => ({ notifySnackbar, notifyBanner }), [notifySnackbar, notifyBanner]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationHost banner={banner} snackbar={snackbar} onClearBanner={() => setBanner(null)} onClearSnackbar={() => setSnackbar(null)} />
    </NotificationContext.Provider>
  );
}

function NotificationHost({ banner, snackbar, onClearBanner, onClearSnackbar }: { banner: Banner, snackbar: Snackbar, onClearBanner: () => void, onClearSnackbar: () => void }) {
  return (
    <>
      {/* Top banner */}
      {banner && (
        <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-safe overflow-hidden">
          <div className="mx-auto max-w-screen-md mt-3 bg-green-50 text-green-900 border border-green-200 rounded-lg shadow p-3 text-sm flex items-center justify-between">
            <span>{banner.message}</span>
            <button onClick={onClearBanner} className="text-green-700 px-2">✕</button>
          </div>
        </div>
      )}
      {/* Bottom snackbar */}
      {snackbar && (
        <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-safe">
          <div className="mx-auto max-w-screen-sm mb-4 bg-gray-900 text-white rounded-lg shadow p-3 text-sm flex items-center justify-between">
            <span className="pr-3">{snackbar.message}</span>
            {snackbar.actionLabel && (
              <button
                onClick={() => { snackbar.onAction?.(); onClearSnackbar(); }}
                className="text-purple-300 font-medium"
              >
                {snackbar.actionLabel}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

