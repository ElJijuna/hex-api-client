import type { HexPackage } from '../domain/Package';
import type { HexRelease } from '../domain/Release';
import type { RequestFn } from './types';

/**
 * Provides access to Hex.pm package metadata and release information
 * for a single named package.
 *
 * Obtain an instance via {@link HexClient.package} — do not construct directly.
 *
 * @example
 * ```typescript
 * const hex = new HexClient();
 *
 * const pkg      = await hex.package('phoenix').get();
 * const versions = await hex.package('phoenix').versions();
 * const release  = await hex.package('phoenix').release('1.7.10');
 * const stable   = await hex.package('phoenix').latestStable();
 * ```
 */
export class PackageResource {
  private readonly name: string;
  private readonly request: RequestFn;

  /** @internal */
  constructor(request: RequestFn, name: string) {
    this.request = request;
    this.name = name;
  }

  /**
   * Returns the full package metadata.
   *
   * `GET /packages/:name`
   *
   * @param signal - Optional `AbortSignal` to cancel the request.
   * @throws {@link HexApiError} with status 404 if the package does not exist.
   */
  async get(signal?: AbortSignal): Promise<HexPackage> {
    return this.request<HexPackage>(`/packages/${this.name}`, undefined, undefined, signal);
  }

  /**
   * Returns all published version strings for the package, in the order
   * returned by the API (oldest → newest).
   *
   * `GET /packages/:name`
   *
   * @param signal - Optional `AbortSignal` to cancel the request.
   * @throws {@link HexApiError} with status 404 if the package does not exist.
   */
  async versions(signal?: AbortSignal): Promise<string[]> {
    const pkg = await this.request<HexPackage>(
      `/packages/${this.name}`,
      undefined,
      undefined,
      signal,
    );

    return pkg.releases.map((r) => r.version);
  }

  /**
   * Returns the full release metadata for the specified version.
   *
   * `GET /packages/:name/releases/:version`
   *
   * @param version - Exact version string to look up (e.g. `'1.7.10'`).
   * @param signal - Optional `AbortSignal` to cancel the request.
   * @throws {@link HexApiError} with status 404 if the release does not exist.
   */
  async release(version: string, signal?: AbortSignal): Promise<HexRelease> {
    return this.request<HexRelease>(
      `/packages/${this.name}/releases/${version}`,
      undefined,
      undefined,
      signal,
    );
  }

  /**
   * Returns the `latest_stable_version` string from the package metadata,
   * or `null` if no stable version has been published.
   *
   * `GET /packages/:name`
   *
   * @param signal - Optional `AbortSignal` to cancel the request.
   * @throws {@link HexApiError} with status 404 if the package does not exist.
   */
  async latestStable(signal?: AbortSignal): Promise<string | null> {
    const pkg = await this.request<HexPackage>(
      `/packages/${this.name}`,
      undefined,
      undefined,
      signal,
    );

    return pkg.latest_stable_version;
  }
}
