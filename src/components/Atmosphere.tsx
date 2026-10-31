import { useEffect, useRef } from 'react';

export function Atmosphere() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const compactScreen = window.matchMedia('(max-width: 920px)');
    let disposed = false;
    let effect: { destroy: () => void } | undefined;

    if (reducedMotion.matches || compactScreen.matches || !hostRef.current) return;

    Promise.all([
      import('vanta/dist/vanta.fog.min'),
      import('three'),
    ])
      .then(([vantaModule, threeModule]) => {
        if (disposed || !hostRef.current) return;
        const startFog = vantaModule.default as unknown as (options: Record<string, unknown>) => { destroy: () => void };
        effect = startFog({
          el: hostRef.current,
          THREE: threeModule,
          mouseControls: false,
          touchControls: false,
          gyroControls: false,
          minHeight: 200,
          minWidth: 200,
          highlightColor: 0x65402e,
          midtoneColor: 0x1b1714,
          lowlightColor: 0x100f0d,
          baseColor: 0x10100f,
          blurFactor: 0.68,
          zoom: 0.82,
        });
      })
      .catch(() => {
        // The CSS atmosphere remains as a low-cost fallback if WebGL is unavailable.
      });

    return () => {
      disposed = true;
      effect?.destroy();
    };
  }, []);

  return <div className="atmosphere" ref={hostRef} aria-hidden="true" />;
}
