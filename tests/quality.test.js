import test from 'node:test';
import assert from 'node:assert/strict';
import { validPct, validOdds, freshness, conditionalSeats, bucketFor, historicalDelta, preserveGood } from '../src/lib/quality.js';
import { WATCHED_RACES, HOUSE_OUTLOOK } from '../src/config/races.config.js';
import { getRaceNews } from '../api/_news.js';
const now = Date.parse('2026-09-14T12:00:00Z');
test('odds reject missing, coerced, infinite and out-of-range values', () => {
  for (const value of [null, undefined, '', '50', NaN, Infinity, -1, 101]) assert.equal(validPct(value), false);
  assert.ok(validOdds({ demYes: 0, repYes: 100 }));
  assert.ok(validOdds({ demYes: 75, repYes: 30 })); // independent Yes prices
  assert.equal(validOdds({ demYes: 50, repYes: null }), false);
});
test('freshness distinguishes recent, stale, invalid and future retrievals', () => {
  assert.equal(freshness('2026-09-14T11:50:00Z', now), 'recent');
  assert.equal(freshness('2026-09-14T11:00:00Z', now), 'stale');
  for (const value of [null, 'bad', '2026-09-15']) assert.equal(freshness(value, now), 'unknown');
});
test('conditional seats do not claim impossible toss-up wins or assured control', () => {
  assert.equal(conditionalSeats(202, 20), '16 of 20 toss-ups needed');
  assert.equal(conditionalSeats(200, 10), '18 needed; 8 must come from other buckets');
  assert.equal(conditionalSeats(220, 5), '0 of 5 toss-ups needed');
});
test('market buckets require two valid sides and respect exact boundaries', () => {
  assert.equal(bucketFor({ sources: [{ demYes: 90, repYes: null }] }), null);
  for (const [spread, bucket] of [[14,'tossup'],[15,'leanD'],[35,'likelyD'],[55,'safeD'],[-55,'safeR']]) assert.equal(bucketFor({sources:[{demYes:50+spread/2,repYes:50-spread/2}]}), bucket);
});
test('real configuration counts conserve all seats and unique race identities', () => {
  assert.equal(Object.values(HOUSE_OUTLOOK.ratings).reduce((a,b) => a+b,0),435);
  const codes=[...WATCHED_RACES.house.map(r=>r.code),...WATCHED_RACES.senate.map(r=>r.stateCode)];
  assert.equal(new Set(codes).size,codes.length);
  const counts={...HOUSE_OUTLOOK.ratings};
  for(const d of WATCHED_RACES.house){counts[d.rating]--; counts.safeD++;}
  assert.ok(Object.values(counts).every(n=>n>=0));
  assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),435);
});
const t = now / 1000;
test('history matches exact UTC day/week and excludes future/invalid prices', () => {
  const pts=[{t:t-7*86400,dem:50},{t:t-86400,dem:54},{t,dem:56.3},{t:t+86400,dem:90}];
  assert.equal(historicalDelta(pts,1,'dem',t).delta,2.3);
  assert.equal(historicalDelta(pts,7,'dem',t).delta,6.3);
  assert.equal(historicalDelta(pts,2,'dem',t).reason,'Missing 2-day comparison');
  assert.equal(historicalDelta([],1,'dem',t).reason,'History unavailable');
});
test('old history is flagged; duplicates keep latest observation within day', () => {
  const pts=[{t:t-10*86400,dem:20},{t:t-10*86400+50,dem:25},{t:t-9*86400,dem:30}];
  const result=historicalDelta(pts,1,'dem',t);
  assert.equal(result.delta,5); // prior day latest observation is 25, not 20
  assert.equal(result.stale,true);
});
test('partial failures preserve last-good source and its original timestamp', () => {
  const old={sources:[{id:'pm',demYes:60,repYes:40,retrievedAt:'2026-09-01'}]};
  const fresh={sources:[{id:'pm',demYes:null,repYes:null,retrievedAt:null}]};
  const result=preserveGood(fresh,old);
  assert.equal(result.sources[0].demYes,60);
  assert.equal(result.sources[0].retrievedAt,'2026-09-01');
  assert.equal(result.sources[0].stale,true);
  assert.equal(preserveGood({sources:[{id:'pm',demYes:61,repYes:39}]},old).sources[0].demYes,61);
});
test('news without a key explicitly unavailable, not fabricated no-news',async()=>{
  const result=await getRaceNews('GA',undefined);
  assert.equal(result.status,'unavailable');
  assert.match(result.reason,/NEWS_API_KEY/);
  assert.deepEqual(result.articles,[]);
});
