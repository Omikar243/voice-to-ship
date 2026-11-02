import { useEffect, type ReactNode } from 'react';

type LenisRootProps = { children: ReactNode };

type LenisInstance = { destroy: () => void };

export function LenisRoot({ children }: LenisRootProps) {
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let instance: LenisInstance | null = null;
    let disposed = false;

    const syncPreference = () => {
      if (preference.matches) {
        instance?.destroy();
        instance = null;
        return;
      }

      if (!instance) {
        void import('lenis').then(({ default: Lenis }) => {
          if (disposed || preference.matches || instance) return;
          instance = new Lenis({ autoRaf: true, lerp: 0.085, smoothWheel: true, syncTouch: false });
        });
      }
    };

    syncPreference();
    preference.addEventListener('change', syncPreference);
    return () => {
      disposed = true;
      preference.removeEventListener('change', syncPreference);
      instance?.destroy();
    };
  }, []);

  return <>{children}</>;
}
