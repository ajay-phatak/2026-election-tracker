import test from 'node:test';
import assert from 'node:assert/strict';
import { getControl } from '../api/_providers.js';
import { getMacroPolls } from '../api/_polls.js';
import { preserveGood } from '../src/lib/quality.js';

test('adapters reject malformed strings, booleans and out-of-range prices', async () => {
  const original = globalThis.fetch;
  try {
    for (const invalid of [null, '', ' ', true, [], '0.5junk', -1, 1.01]) {
      globalThis.fetch = async input => new Response(JSON.stringify(String(input).includes('polymarket') ? [{ markets: [
        { question: 'Democrats', outcomes: '["Yes","No"]', outcomePrices: JSON.stringify([invalid, 0.4]) },
      ] }] : { candlesticks: [{ end_period_ts: 1789344000, price: { close_dollars: invalid } }] }));
      const result = await getControl();
      for (const source of result.senate.sources) assert.equal(source.demYes, null, JSON.stringify(invalid));
    }
  } finally { globalThis.fetch = original; }
});

test('poll adapter rejects whitespace and boolean averages', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({'2026-09-14': {dem: {average: ' '}, rep: {average: true}}}));
  try {
    const result = await getMacroPolls();
    assert.equal(result.genericBallot.dem, null);
    assert.equal(result.genericBallot.rep, null);
  } finally { globalThis.fetch = original; }
});

test('last-good fallback cannot substitute a different provider at the same index', () => {
  const old = {sources: [{id: 'polymarket', demYes: 60, repYes: 40}]};
  const result = preserveGood({sources: [{id: 'kalshi', demYes: null, repYes: null}]}, old);
  assert.equal(result.sources[0].id, 'kalshi');
  assert.equal(result.sources[0].demYes, null);
});
