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
import { answerVoiceQuestion, validateVoiceQuestion } from '../server/voiceAgent.js';

beforeEach(() => resetPerformanceSamples());

test('accepts only allowlisted anonymous analytics events', () => {
  assert.deepEqual(validatePublicEvent({ eventType: 'click', targetId: 'idea-engine-step-1-option-a', source: 'github' }), {
    eventType: 'click',
    targetId: 'idea-engine-step-1-option-a',
    source: 'github',
  });
  assert.equal(validatePublicEvent({ eventType: 'visit_start', targetId: 'portfolio-visit', source: 'direct' }).eventType, 'visit_start');
  assert.throws(() => validatePublicEvent({ eventType: 'click', targetId: 'visitor@example.com' }), /Invalid analytics event/);
  assert.throws(() => validatePublicEvent({ eventType: 'page_view', targetId: 'portfolio-home', visitor: 'nope' }), /Invalid analytics event/);
});

test('accepts bounded browser metrics and rejects unsafe payloads', () => {
  assert.equal(validateBrowserMetric({ name: 'LCP', value: 842.5 }), true);
  assert.equal(validateBrowserMetric({ name: 'user-agent', value: 10 }), false);
  assert.equal(validateBrowserMetric({ name: 'CLS', value: -1 }), false);
  assert.equal(validateBrowserMetric({ name: 'INP', value: 120001 }), false);
});

test('accepts bounded voice questions and rejects malformed requests', () => {
  assert.equal(validateVoiceQuestion({ question: 'What did Omkar build?' }), true);
  assert.equal(validateVoiceQuestion({ question: ' '.repeat(901) }), false);
  assert.equal(validateVoiceQuestion({ question: 42 }), false);
  assert.equal(validateVoiceQuestion({ question: 'Play Signal Lost' }), true);
});

const geminiAnswer = { candidates: [{ content: { parts: [{ text: 'Omkar builds things to understand how they work.' }] } }] };

test('retries network failures and capacity responses before answering', async () => {
  process.env.GEMINI_API_KEY = 'test-key';
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) throw new Error('network unreachable');
    if (calls === 2) return { ok: false, status: 503, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => geminiAnswer };
  };
  try {
    const answer = await answerVoiceQuestion('What did Omkar build?');
    assert.equal(answer.text, 'Omkar builds things to understand how they work.');
    assert.equal(answer.model, 'gemini-flash-lite-latest');
    assert.equal(calls, 3);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.GEMINI_API_KEY;
  }
});

test('maps persistent provider failures to 502 instead of an unhandled crash', async () => {
  process.env.GEMINI_API_KEY = 'test-key';
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('provider timeout'); };
  try {
    await assert.rejects(() => answerVoiceQuestion('What did Omkar build?'), (error) => {
      assert.equal(error.status, 502);
      return true;
    });
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.GEMINI_API_KEY;
  }
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
  assert.match(source, /a score alone does not explain what changed/);
  assert.match(source, /Knee osteoarthritis detection using CNN/);
  assert.match(source, /Ancient Modern Apparel/);
  assert.match(source, /Production AI systems in sustainable finance/);
  assert.match(source, /linkedin\.com\/in\/omkar-shettigar-43035737a/);
});
