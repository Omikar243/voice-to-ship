import { useEffect } from 'react';

type MetricName = 'CLS' | 'FCP' | 'INP' | 'LCP';

type Metric = { name: MetricName; value: number };

function sendMetric(metric: Metric) {
  if (!Number.isFinite(metric.value) || metric.value < 0) return;
  const body = JSON.stringify(metric);
  try {
    if (navigator.sendBeacon?.('/api/performance', new Blob([body], { type: 'application/json' }))) return;
  } catch {
    // Fall through to fetch when Beacon is unavailable.
  }
  void fetch('/api/performance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
    credentials: 'same-origin',
  }).catch(() => undefined);
}

export function PerformanceMonitor() {
  useEffect(() => {
    if (window.location.pathname === '/insights' || typeof PerformanceObserver === 'undefined') return undefined;

    const observers: PerformanceObserver[] = [];
    const observe = (type: string, callback: (entries: PerformanceEntryList) => void, buffered = true) => {
      try {
        if (!PerformanceObserver.supportedEntryTypes?.includes(type)) return;
        const observer = new PerformanceObserver((list) => callback(list.getEntries()));
        observer.observe({ type, buffered });
        observers.push(observer);
      } catch {
        // Performance monitoring is best-effort and must never affect the portfolio.
      }
    };

    observe('paint', (entries) => {
      const firstContentfulPaint = entries.find((entry) => entry.name === 'first-contentful-paint');
      if (firstContentfulPaint) sendMetric({ name: 'FCP', value: firstContentfulPaint.startTime });
    });
    observe('largest-contentful-paint', (entries) => {
      const entry = entries[entries.length - 1];
      if (entry) sendMetric({ name: 'LCP', value: entry.startTime });
    });
    observe('layout-shift', (entries) => {
      const value = entries.reduce((total, entry) => total + (entry as PerformanceEntry & { value?: number }).value!, 0);
      if (value > 0) sendMetric({ name: 'CLS', value });
    });
    observe('event', (entries) => {
      const interaction = entries[entries.length - 1];
      const duration = (interaction as PerformanceEntry & { duration?: number })?.duration;
      if (typeof duration === 'number') sendMetric({ name: 'INP', value: duration });
    }, false);

    return () => observers.forEach((observer) => observer.disconnect());
  }, []);

  return null;
}
