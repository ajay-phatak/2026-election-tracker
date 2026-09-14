import test from 'node:test';
import assert from 'node:assert/strict';
import { getControl } from '../api/_providers.js';
import { getMacroPolls } from '../api/_polls.js';
import { preserveGood, markStale } from '../src/lib/quality.js';

test('provider adapter fetches providers directly; retrieval and candle observation stay distinct', async () => {
  const original = globalThis.fetch;
  const urls = [];
  globalThis.fetch = async (input) => {
    const url = String(input); urls.push(url);
    const data = url.includes('gamma-api.polymarket.com') ? [{ markets: [
      { question: 'Will Democrats win?', outcomes: '["Yes","No"]', outcomePrices: '["0.60","0.40"]' },
      { question: 'Will Republicans win?', outcomes: '["Yes","No"]', outcomePrices: '["0.41","0.59"]' },
    ] }] : { candlesticks: [{ end_period_ts: 1789344000, price: { close_dollars: '0.55' } }] };
    return new Response(JSON.stringify(data), {status:200});
  };
  try {
    const result = await getControl();
    assert.equal(result.senate.sources[0].demYes, 60);
    assert.equal(result.senate.sources[0].repYes, 41);
    assert.equal(result.senate.sources[0].observationAt, null);
    assert.equal(result.senate.sources[1].observationAt, '2026-09-14T00:00:00.000Z');
    assert.ok(result.senate.sources[1].retrievedAt);
    assert.ok(urls.every(u => ['gamma-api.polymarket.com','api.elections.kalshi.com'].includes(new URL(u).hostname)));
  } finally { globalThis.fetch = original; }
});
test('poll adapter does not turn null averages into zero', async () => {
  const original=globalThis.fetch;
  globalThis.fetch=async()=>new Response(JSON.stringify({'2026-09-14':{dem:{average:null},rep:{average:40},approve:{average:101},disapprove:{average:55}}}));
  try {
    const p=await getMacroPolls();
    assert.equal(p.genericBallot.dem,null);
    assert.equal(p.genericBallot.rep,40);
    assert.equal(p.approval.approve,null);
  } finally { globalThis.fetch=original; }
});
test('whole-request and null polling fallback flag original data as stale', () => {
  const old={control:{sources:[{demYes:70,repYes:30,retrievedAt:'2026-09-01'}]},polls:{dem:48,lastUpdated:'2026-09-01'}};
  assert.equal(markStale(old).control.sources[0].stale,true);
  const result=preserveGood({polls:null},old);
  assert.equal(result.polls.dem,48);
  assert.equal(result.polls.stale,true);
  assert.equal(result.polls.lastUpdated,'2026-09-01');
});
