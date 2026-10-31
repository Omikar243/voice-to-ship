import { useEffect, type ReactNode } from 'react';
import Lenis from 'lenis';

type LenisRootProps = { children: ReactNode };

export function LenisRoot({ children }: LenisRootProps) {
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let instance: Lenis | null = null;

    const syncPreference = () => {
      if (preference.matches) {
        instance?.destroy();
        instance = null;
        return;
      }

      if (!instance) {
        instance = new Lenis({
          autoRaf: true,
          lerp: 0.085,
          smoothWheel: true,
          syncTouch: false,
        });
      }
    };

    syncPreference();
    preference.addEventListener('change', syncPreference);
    return () => {
      preference.removeEventListener('change', syncPreference);
      instance?.destroy();
    };
  }, []);

  return <>{children}</>;
}
