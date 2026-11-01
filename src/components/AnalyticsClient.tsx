import { useEffect, useRef } from 'react';

const TRACKING_KEY = 'voice-to-ship-analytics-off';
const CONTROL_SELECTOR = 'a[href], button:not([disabled]), [role="button"], [role="option"], [role="tab"], [role="radio"], [role="switch"]';

type EventType = 'page_view' | 'visit_start' | 'impression' | 'click';
type Source = 'direct' | 'search' | 'social' | 'github' | 'referral' | 'other';

function readTrackingPreference() {
  try {
    return window.localStorage.getItem(TRACKING_KEY) !== 'true';
  } catch {
    return true;
  }
}

function makeControlId(control: HTMLElement) {
  const existing = control.dataset.analyticsId;
  if (existing) return existing;

  const section = control.closest<HTMLElement>('[data-chapter], section[id]');
  const sectionId = section?.dataset.chapter || section?.id || 'site';
  const scope = section ?? document.body;
  const controls = Array.from(scope.querySelectorAll<HTMLElement>(CONTROL_SELECTOR));
  const position = Math.max(0, controls.indexOf(control)) + 1;
  const identifier = `auto-${sectionId}-${control.tagName.toLowerCase()}-${position}`
    .toLowerCase()
    .replace(/[^a-z0-9:_-]/g, '_')
    .slice(0, 64);

  control.dataset.analyticsId = identifier;
  return identifier;
}

function sourceBucket(): Source {
  try {
    const hostname = document.referrer ? new URL(document.referrer).hostname.toLowerCase() : '';
    if (!hostname) return 'direct';
    if (hostname.includes('google.') || hostname.includes('bing.') || hostname.includes('duckduckgo.')) return 'search';
    if (hostname.includes('github.')) return 'github';
    if (hostname.includes('linkedin.') || hostname.includes('twitter.') || hostname.includes('x.com') || hostname.includes('instagram.') || hostname.includes('facebook.')) return 'social';
    if (hostname === window.location.hostname) return 'direct';
    return 'referral';
  } catch {
    return 'other';
  }
}

function sendEvent(eventType: EventType, targetId: string, source = sourceBucket()) {
  const payload = JSON.stringify({ eventType, targetId, source });
  const body = new Blob([payload], { type: 'application/json' });

  try {
    if (navigator.sendBeacon?.('/api/analytics/events', body)) return;
  } catch {
    // Fall through to fetch when Beacon is unavailable or the queue is full.
  }

  void fetch('/api/analytics/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
    credentials: 'same-origin',
  }).catch(() => undefined);
}

export function AnalyticsClient() {
  const trackingEnabled = readTrackingPreference();
  const pageViewSent = useRef(false);

  useEffect(() => {
    if (!trackingEnabled || window.location.pathname === '/insights') return undefined;

    if (!pageViewSent.current) {
      sendEvent('page_view', 'portfolio-home');
      try {
        if (window.sessionStorage.getItem('vts-visit-started') !== 'true') {
          sendEvent('visit_start', 'portfolio-visit');
          window.sessionStorage.setItem('vts-visit-started', 'true');
        }
      } catch {
        sendEvent('visit_start', 'portfolio-visit');
      }
      pageViewSent.current = true;
    }

    const observed = new WeakSet<Element>();
    const impressed = new Set<string>();
    const pending = new Map<Element, number>();
    const observer = 'IntersectionObserver' in window
      ? new IntersectionObserver((entries) => {
        for (const entry of entries) {
          const control = entry.target as HTMLElement;
          const targetId = makeControlId(control);
          const timer = pending.get(control);

          if (entry.isIntersecting && entry.intersectionRatio >= 0.5 && !impressed.has(targetId) && timer === undefined) {
            const nextTimer = window.setTimeout(() => {
              pending.delete(control);
              if (control.isConnected && !impressed.has(targetId)) {
                impressed.add(targetId);
                sendEvent('impression', targetId);
              }
            }, 700);
            pending.set(control, nextTimer);
          } else if ((!entry.isIntersecting || entry.intersectionRatio < 0.5) && timer !== undefined) {
            window.clearTimeout(timer);
            pending.delete(control);
          }
        }
      }, { threshold: [0.5] })
      : null;

    const tagAndObserve = () => {
      const controls = document.querySelectorAll<HTMLElement>(CONTROL_SELECTOR);
      controls.forEach((control) => {
        if (control.closest('[data-analytics-ignore="true"]')) return;
        makeControlId(control);
        if (!observer || observed.has(control)) return;
        observed.add(control);
        observer.observe(control);
      });
    };

    const onClick = (event: MouseEvent) => {
      const origin = event.target;
      if (!(origin instanceof Element)) return;
      const control = origin.closest<HTMLElement>(CONTROL_SELECTOR);
      if (!control || control.closest('[data-analytics-ignore="true"]')) return;
      sendEvent('click', makeControlId(control));
    };

    const mutations = new MutationObserver(tagAndObserve);
    mutations.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('click', onClick, true);
    tagAndObserve();

    return () => {
      mutations.disconnect();
      observer?.disconnect();
      pending.forEach((timer) => window.clearTimeout(timer));
      pending.clear();
      document.removeEventListener('click', onClick, true);
    };
  }, [trackingEnabled]);

  return null;
}

export function analyticsEnabledForCurrentDevice() {
  return readTrackingPreference();
}
