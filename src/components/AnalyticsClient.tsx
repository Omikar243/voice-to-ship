import { useEffect, useRef, useState } from 'react';

const TRACKING_KEY = 'voice-to-ship-analytics-off';
const NOTICE_KEY = 'voice-to-ship-analytics-notice-dismissed';
const CONTROL_SELECTOR = 'a[href], button:not([disabled]), [role="button"], [role="option"], [role="tab"], [role="radio"], [role="switch"]';

type EventType = 'page_view' | 'impression' | 'click';

function readTrackingPreference() {
  try {
    return window.localStorage.getItem(TRACKING_KEY) !== 'true';
  } catch {
    return true;
  }
}

function readNoticePreference() {
  try {
    return window.localStorage.getItem(NOTICE_KEY) !== 'true';
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

function sendEvent(eventType: EventType, targetId: string) {
  const payload = JSON.stringify({ eventType, targetId });
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
  const [trackingEnabled, setTrackingEnabled] = useState(readTrackingPreference);
  const [noticeOpen, setNoticeOpen] = useState(readNoticePreference);
  const pageViewSent = useRef(false);

  useEffect(() => {
    const openSettings = () => setNoticeOpen(true);
    window.addEventListener('vts:open-analytics-settings', openSettings);
    return () => window.removeEventListener('vts:open-analytics-settings', openSettings);
  }, []);

  useEffect(() => {
    if (!trackingEnabled || window.location.pathname === '/insights') return undefined;

    if (!pageViewSent.current) {
      sendEvent('page_view', 'portfolio-home');
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

  const rememberNotice = () => {
    try {
      window.localStorage.setItem(NOTICE_KEY, 'true');
    } catch {
      // The setting still works for the current page when storage is unavailable.
    }
  };

  const setTracking = (enabled: boolean) => {
    setTrackingEnabled(enabled);
    setNoticeOpen(false);
    rememberNotice();
    try {
      window.localStorage.setItem(TRACKING_KEY, enabled ? 'false' : 'true');
    } catch {
      // The opt-out still applies until the current page is closed.
    }
  };

  const dismiss = () => {
    rememberNotice();
    setNoticeOpen(false);
  };

  if (!noticeOpen || window.location.pathname === '/insights') return null;

  return (
    <aside className="analytics-notice" aria-label="Anonymous traffic analytics" data-analytics-ignore="true">
      <div className="analytics-notice__copy">
        <span className="analytics-notice__label">A SMALL PRIVACY NOTE</span>
        <p>This site counts page views, visible controls, clicks and—when enabled—completed CV downloads to understand which parts are useful. The app does not store what you type, visitor identity, IP address or user-agent in its analytics records. Raw events expire after 30 days; daily totals remain. Each completed full-CV download also sends the owner a notice without identifying you; opting out stops analytics counts, not that operational notice.</p>
      </div>
      <div className="analytics-notice__actions">
        <span className="analytics-notice__state">Anonymous counts are {trackingEnabled ? 'on' : 'off'} on this device.</span>
        <button type="button" onClick={() => setTracking(!trackingEnabled)}>{trackingEnabled ? 'Turn off' : 'Turn on'} anonymous counts</button>
        <button className="analytics-notice__close" type="button" aria-label="Close privacy note" onClick={dismiss}>Close</button>
      </div>
    </aside>
  );
}

export function openAnalyticsSettings() {
  window.dispatchEvent(new Event('vts:open-analytics-settings'));
}

export function analyticsEnabledForCurrentDevice() {
  return readTrackingPreference();
}
