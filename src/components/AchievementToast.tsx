'use client';

import { useEffect, useState } from 'react';
import { subscribe } from '@/lib/eventBus';

interface Toast {
  id: number;
  title: string;
  description: string;
  icon: string;
  expires: number;
}

export default function AchievementToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const unsub = subscribe((e) => {
      if (e.type !== 'achievement') return;
      const toast: Toast = {
        id: e.id,
        title: e.message,
        description: (e.data?.description as string) || '',
        icon: (e.data?.icon as string) || '\u{1F3C6}',
        expires: Date.now() + 4000,
      };
      setToasts((prev) => [...prev, toast]);
    });
    return unsub;
  }, []);

  // Cleanup
  useEffect(() => {
    if (toasts.length === 0) return;
    const interval = setInterval(() => {
      setToasts((prev) => prev.filter((t) => t.expires > Date.now()));
    }, 200);
    return () => clearInterval(interval);
  }, [toasts.length]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 rounded-xl border-2 border-amber-300 px-4 py-3 shadow-2xl animate-slide-in-right"
          style={{ minWidth: 240, maxWidth: 320 }}
        >
          <div className="flex items-center gap-3">
            <div className="text-3xl animate-pop">{t.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-amber-200 uppercase tracking-widest">Achievement Unlocked!</p>
              <p className="text-white font-extrabold text-sm leading-tight">{t.title}</p>
              {t.description && (
                <p className="text-amber-100/90 text-xs mt-0.5">{t.description}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
