# hex-api-client

<p align="center">
  <img src="https://hex.pm/images/hex-full-a8183c4f9adac71516516d107d402b18.svg?vsn=d" alt="Hex.pm logo" width="200" />
</p>

[![npm version](https://img.shields.io/npm/v/hex-api-client)](https://www.npmjs.com/package/hex-api-client)
[![npm downloads](https://img.shields.io/npm/dm/hex-api-client)](https://www.npmjs.com/package/hex-api-client)
[![Bundle size](https://img.shields.io/bundlephobia/minzip/hex-api-client)](https://bundlephobia.com/package/hex-api-client)
[![CI](https://github.com/ElJijuna/hex-api-client/actions/workflows/ci.yml/badge.svg)](https://github.com/ElJijuna/hex-api-client/actions/workflows/ci.yml)
[![semantic-release: angular](https://img.shields.io/badge/semantic--release-angular-e10079?logo=semantic-release)](https://github.com/semantic-release/semantic-release)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.x-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/node/v/hex-api-client)](https://nodejs.org/)

TypeScript client for the [Hex.pm](https://hex.pm) package registry API. Covers package metadata, version listings, release details, and package search. Works in **Node.js** and the **browser** (isomorphic). Fully typed, zero runtime dependencies.

**Data source:**

| Source | What it provides |
| --- | --- |
| [hex.pm/api](https://hex.pm/api) | Package metadata, release details, version listings, and search |

---

## Installation

```bash
npm install hex-api-client
```

---

## Quick start

```typescript
import { HexClient } from 'hex-api-client';

// Public API — no auth required
const hex = new HexClient();

// Custom registry (e.g. a self-hosted Hex.pm instance)
const privateFeed = new HexClient({
  baseUrl: 'https://my-hex.example.com/api',
});
```

---

## API reference

### Package metadata

```typescript
// Full package metadata
const pkg = await hex.package('phoenix').get();
console.log(pkg.name);                  // 'phoenix'
console.log(pkg.latest_stable_version); // '1.7.14'
console.log(pkg.meta.description);      // 'Productive web framework'
console.log(pkg.meta.licenses);         // ['MIT']
console.log(pkg.releases.length);       // total published releases

// Latest stable version string (or null if none)
const stable = await hex.package('phoenix').latestStable();
console.log(stable); // '1.7.14'
```

### Version listings

```typescript
// All published version strings (oldest → newest)
const versions = await hex.package('phoenix').versions();
console.log(versions); // ['0.1.0', '0.2.0', ..., '1.7.14']
```

### Release details

```typescript
// Full release metadata for a specific version
const release = await hex.package('phoenix').release('1.7.14');
console.log(release.version);              // '1.7.14'
console.log(release.checksum);             // hex checksum string
console.log(release.has_docs);             // true
console.log(release.publisher?.username);  // 'chrismccord'
console.log(release.meta.build_tools);     // ['mix']
console.log(release.meta.elixir);          // '~> 1.14'
console.log(release.retirement);           // null (or { reason, message } if retired)
```

### Search

```typescript
const results = await hex.packages({ search: 'phoenix', per_page: 10 });

console.log(results.length); // up to 10 packages

results.forEach(pkg => {
  console.log(pkg.name);                  // 'phoenix'
  console.log(pkg.latest_stable_version); // '1.7.14'
  console.log(pkg.meta.description);      // 'Productive web framework'
});

// Paginate
const page2 = await hex.packages({ search: 'ecto', page: 2, per_page: 20 });
```

| Parameter | Type | Description |
| --- | --- | --- |
| `search` | `string` | Search query (optional — omit to list all packages) |
| `page` | `number` | Page number for pagination |
| `per_page` | `number` | Results per page |

---

## Cancelling requests

Pass an `AbortSignal` to any method to cancel the in-flight request:

```typescript
const controller = new AbortController();
setTimeout(() => controller.abort(), 5000);

await hex.package('phoenix').get(controller.signal);
await hex.package('phoenix').versions(controller.signal);
await hex.package('phoenix').release('1.7.14', controller.signal);
await hex.package('phoenix').latestStable(controller.signal);
await hex.packages({ search: 'phoenix' }, controller.signal);
```

When aborted, `fetch` throws a `DOMException` with `name === 'AbortError'`. The `request` event is still emitted with the error attached.

---

## Request events

Subscribe to every HTTP request for logging, monitoring, or debugging:

```typescript
hex.on('request', (event) => {
  console.log(`[${event.statusCode}] ${event.method} ${event.url} (${event.durationMs}ms)`);
  if (event.error) {
    console.error('Request failed:', event.error.message);
  }
});
```

| Field | Type | Description |
| --- | --- | --- |
| `url` | `string` | Full URL requested |
| `method` | `'GET'` | HTTP method |
| `startedAt` | `Date` | When the request started |
| `finishedAt` | `Date` | When the request finished |
| `durationMs` | `number` | Duration in milliseconds |
| `statusCode` | `number \| undefined` | HTTP status code, if a response was received |
| `error` | `Error \| undefined` | Present only if the request failed |

`on()` is chainable and supports multiple listeners:

```typescript
hex
  .on('request', logToConsole)
  .on('request', sendToDatadog);
```

---

## Error handling

Non-2xx responses throw a `HexApiError`:

```typescript
import { HexApiError } from 'hex-api-client';

try {
  await hex.package('non-existent-package-xyz').get();
} catch (err) {
  if (err instanceof HexApiError) {
    console.log(err.status);     // 404
    console.log(err.statusText); // 'Not Found'
    console.log(err.message);    // 'Hex API error: 404 Not Found'
  }
}
```

---

## TypeScript types

All domain types are exported:

```typescript
import type {
  // Client
  HexClientOptions,
  RequestEvent,
  HexClientEvents,

  // Package
  HexPackage,
  HexPackageMeta,
  HexPackageRelease,
  HexPackageSearchParams,

  // Release
  HexRelease,
  HexReleaseMeta,
  HexReleasePublisher,
  HexReleaseRetirement,
} from 'hex-api-client';
```

---

## License

[MIT](LICENSE)
