import assert from 'node:assert/strict';
import { test, beforeEach } from 'node:test';
import { readFile } from 'node:fs/promises';
import { validatePublicEvent } from '../server/analytics.js';
import {
  performanceSnapshot,
  recordBrowserMetric,
  resetPerformanceSamples,
  validateBrowserMetric,
} from '../server/performance.js';

beforeEach(() => resetPerformanceSamples());

test('accepts only allowlisted anonymous analytics events', () => {
  assert.deepEqual(validatePublicEvent({ eventType: 'click', targetId: 'idea-engine-step-1-option-a' }), {
    eventType: 'click',
    targetId: 'idea-engine-step-1-option-a',
  });
  assert.throws(() => validatePublicEvent({ eventType: 'click', targetId: 'visitor@example.com' }), /Invalid analytics event/);
  assert.throws(() => validatePublicEvent({ eventType: 'page_view', targetId: 'portfolio-home', visitor: 'nope' }), /Invalid analytics event/);
});

test('accepts bounded browser metrics and rejects unsafe payloads', () => {
  assert.equal(validateBrowserMetric({ name: 'LCP', value: 842.5 }), true);
  assert.equal(validateBrowserMetric({ name: 'user-agent', value: 10 }), false);
  assert.equal(validateBrowserMetric({ name: 'CLS', value: -1 }), false);
  assert.equal(validateBrowserMetric({ name: 'INP', value: 120001 }), false);
});

test('summarizes request and browser performance without identity data', () => {
  recordBrowserMetric('FCP', 100);
  recordBrowserMetric('FCP', 220);
  recordBrowserMetric('FCP', 300);
  const summary = performanceSnapshot();
  assert.deepEqual(summary, [{ route: 'browser FCP', samples: 3, p50Ms: 220, p95Ms: 300 }]);
  assert.equal(JSON.stringify(summary).includes('user-agent'), false);
  assert.equal(JSON.stringify(summary).includes('127.0.0.1'), false);
});

test('keeps the about story and verified case-study anchors present', async () => {
  const source = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
  assert.match(source, /can someone trust the system enough to use what it produces/);
  assert.match(source, /Knee osteoarthritis detection using CNN/);
  assert.match(source, /Ancient Modern Apparel/);
  assert.match(source, /Production AI systems at Catalysk/);
  assert.match(source, /linkedin\.com\/in\/omkar-shettigar-43035737a/);
});
