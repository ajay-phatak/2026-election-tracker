import test from 'node:test';
import assert from 'node:assert/strict';
import { getControl } from '../api/_providers.js';

test('carried-forward candle prices retain strict validation and real timestamps', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (input) => new Response(JSON.stringify(
    String(input).includes('gamma-api.polymarket.com') ? [] : {
      candlesticks: [
        { end_period_ts: 1789344000, price: { previous_dollars: '0.55' } },
        { end_period_ts: 1789430400, price: { previous_dollars: '0.7garbage' } },
        { end_period_ts: 1789516800, price: { previous_dollars: '1.5' } },
        { end_period_ts: 'invalid', price: { previous_dollars: '0.9' } },
      ],
    }
  ));
  try {
    const result = await getControl();
    const source = result.senate.sources.find(s => s.id === 'kalshi');
    assert.equal(source.demYes, 55);
    assert.equal(source.observationAt, '2026-09-14T00:00:00.000Z');
  } finally { globalThis.fetch = original; }
});
