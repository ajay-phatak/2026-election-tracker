# Dashboard data interpretation

Market percentages are independent Democrat and Republican Yes prices, not vote shares or a combined forecast. They may sum above or below 100%. Poll gaps are percentage points (pp).

## Coverage and seat arithmetic

The House market rollup is a hybrid: only watched seats with two valid market prices replace their configured rating. The displayed count reports that coverage out of 435; all remaining seats retain the configured ratings. The 15/35/55 pp price-spread buckets are heuristics, not calibrated probabilities. Majority arithmetic assumes every lean-or-better seat is won and explicitly reports when toss-ups cannot cover the shortfall. The configured seat snapshot is not live; its observation date is unknown. Map categories remain attributed to Ajay Phatak's subjective judgments, with an unknown review date.

## Dates, refresh and browser fallback

Data loads on page load, not as a stream. Reload retries the requests. Existing Cloudflare KV, edge caching, routes, refresh workflow and provider retry policies are unchanged. `retrievedAt` records adapter retrieval (which may read an edge cache), not the provider's last price change. Existing `lastUpdated` remains for compatibility. Kalshi `observationAt` records the older of the two latest daily candle endpoints; Polymarket source-change time is unknown. Poll dates describe the polling data, not page retrieval.

Successful JSON responses are saved in localStorage under `election-tracker:last-good:<URL>`. A failed request can return saved data marked stale. Partial invalid market sources can retain a previously valid two-sided source matched by ID; original dates are retained. A page-level warning accompanies fallback. This is best-effort browser storage, not an archive: storage denial is tolerated, empty history responses are not replaced, and missing/invalid individual polling fields are not reconstructed. Clear site storage to remove it. There is no automatic expiry or scheduled browser refresh.

## What changed

Senate and House show Polymarket and Kalshi side by side. Day/week comparisons use each provider's latest available daily history and the exact preceding UTC day/week, never today's quote minus a historical candle. Missing comparison days are not interpolated. Duplicate observations use the last timestamp within the day. History older than two days is marked stale; displayed UTC dates are buckets, not precise quote times. Price changes do not establish causation. Charts no longer connect through explicit null values.

## Validation

Run `npm ci`, `npm test`, `npm run lint`, and `npm run build`. Tests use deterministic provider fixtures and cover malformed prices, source dates, history gaps, seat conservation, and last-good identity/timestamp preservation. They do not certify live provider availability or new election ratings. Branding, advertising, privacy links, hosting configuration, and deployment workflows are unchanged.
