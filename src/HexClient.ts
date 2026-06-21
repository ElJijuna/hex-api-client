import type { HexPackage, HexPackageSearchParams } from './domain/Package';
import { HexApiError } from './errors/HexApiError';
import { PackageResource } from './resources/PackageResource';

const DEFAULT_BASE_URL = 'https://hex.pm/api';

/** Payload emitted on every HTTP request made by {@link HexClient}. */
export interface RequestEvent {
  url: string;
  method: 'GET';
  startedAt: Date;
  finishedAt: Date;
  durationMs: number;
  statusCode?: number;
  error?: Error;
}

/** Map of supported client events to their callback signatures. */
export interface HexClientEvents {
  request: (event: RequestEvent) => void;
}

/** Constructor options for {@link HexClient}. */
export interface HexClientOptions {
  /**
   * Base URL for the Hex.pm API (default: `'https://hex.pm/api'`).
   * Override for self-hosted Hex.pm instances.
   */
  baseUrl?: string;
}

/**
 * Main entry point for the Hex.pm REST API client.
 *
 * @example
 * ```typescript
 * import { HexClient } from 'hex-api-client';
 *
 * const hex = new HexClient();
 *
 * // List/search packages
 * const results = await hex.packages({ search: 'phoenix', per_page: 10 });
 *
 * // Get a specific package
 * const pkg = await hex.package('phoenix').get();
 *
 * // Get all published versions
 * const versions = await hex.package('phoenix').versions();
 *
 * // Get a specific release
 * const release = await hex.package('phoenix').release('1.7.10');
 *
 * // Get latest stable version string
 * const latest = await hex.package('phoenix').latestStable();
 * ```
 */
export class HexClient {
  private readonly baseUrl: string;
  private readonly listeners: Map<keyof HexClientEvents, HexClientEvents[keyof HexClientEvents][]> =
    new Map();

  constructor(options: HexClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  }

  on<K extends keyof HexClientEvents>(event: K, callback: HexClientEvents[K]): this {
    const cbs = this.listeners.get(event) ?? [];

    cbs.push(callback);
    this.listeners.set(event, cbs);

    return this;
  }

  private emit<K extends keyof HexClientEvents>(
    event: K,
    payload: Parameters<HexClientEvents[K]>[0],
  ): void {
    const cbs = this.listeners.get(event) ?? [];

    for (const cb of cbs) {
      (cb as (p: typeof payload) => void)(payload);
    }
  }

  /** @internal */
  private async request<T>(
    path: string,
    params?: Record<string, string | number | boolean>,
    _baseUrl?: string,
    signal?: AbortSignal,
  ): Promise<T> {
    const url = buildUrl(`${this.baseUrl}${path}`, params);
    const startedAt = new Date();

    let statusCode: number | undefined;

    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal,
      });

      statusCode = response.status;

      if (!response.ok) {
        throw new HexApiError(response.status, response.statusText);
      }

      const data = (await response.json()) as T;

      this.emit('request', {
        url,
        method: 'GET',
        startedAt,
        finishedAt: new Date(),
        durationMs: Date.now() - startedAt.getTime(),
        statusCode,
      });

      return data;
    } catch (err) {
      const finishedAt = new Date();

      this.emit('request', {
        url,
        method: 'GET',
        startedAt,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        statusCode,
        error: err instanceof Error ? err : new Error(String(err)),
      });

      throw err;
    }
  }

  /**
   * Returns a {@link PackageResource} for the given package name.
   *
   * @param name - The Hex.pm package name (e.g. `'phoenix'`, `'ecto'`).
   * @returns A chainable package resource.
   */
  package(name: string): PackageResource {
    return new PackageResource(
      <T>(
        path: string,
        params?: Record<string, string | number | boolean>,
        baseUrl?: string,
        signal?: AbortSignal,
      ) => this.request<T>(path, params, baseUrl, signal),
      name,
    );
  }

  /**
   * Lists or searches packages.
   *
   * `GET /packages?search=<query>&page=<n>&per_page=<n>`
   *
   * @param params - Optional filter/pagination parameters.
   * @param signal - Optional `AbortSignal` to cancel the request.
   * @returns Array of matching {@link HexPackage} objects.
   *
   * @example
   * ```typescript
   * const results = await hex.packages({ search: 'phoenix', per_page: 20 });
   * ```
   */
  async packages(params: HexPackageSearchParams = {}, signal?: AbortSignal): Promise<HexPackage[]> {
    return this.request<HexPackage[]>(
      '/packages',
      {
        ...(params.search !== undefined && { search: params.search }),
        ...(params.page !== undefined && { page: params.page }),
        ...(params.per_page !== undefined && { per_page: params.per_page }),
      },
      undefined,
      signal,
    );
  }
}

function buildUrl(base: string, params?: Record<string, string | number | boolean>): string {
  if (!params) {
    return base;
  }

  const entries = Object.entries(params).filter(([, v]) => v !== undefined);

  if (entries.length === 0) {
    return base;
  }

  const search = new URLSearchParams(entries.map(([k, v]) => [k, String(v)]));

  return `${base}?${search.toString()}`;
}
