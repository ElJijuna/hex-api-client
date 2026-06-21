import { HexApiError, HexClient } from './index';

const mockFetch = jest.fn();

global.fetch = mockFetch;

function mockResponse<T>(data: T, status = 200): void {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
  });
}

const packagesFixture = [
  {
    name: 'phoenix',
    url: 'https://hex.pm/api/packages/phoenix',
    html_url: 'https://hex.pm/packages/phoenix',
    docs_html_url: 'https://hexdocs.pm/phoenix',
    meta: { description: 'Web framework', licenses: ['MIT'], links: {}, maintainers: [] },
    latest_stable_version: '1.7.10',
    latest_version: '1.7.10',
    inserted_at: '2014-12-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    releases: [],
  },
  {
    name: 'ecto',
    url: 'https://hex.pm/api/packages/ecto',
    html_url: 'https://hex.pm/packages/ecto',
    docs_html_url: null,
    meta: { description: 'Database wrapper', licenses: ['Apache-2.0'], links: {}, maintainers: [] },
    latest_stable_version: '3.11.0',
    latest_version: '3.11.0',
    inserted_at: '2015-01-01T00:00:00Z',
    updated_at: '2024-02-01T00:00:00Z',
    releases: [],
  },
];

describe('HexClient', () => {
  let hex: HexClient;

  beforeEach(() => {
    mockFetch.mockClear();
    hex = new HexClient();
  });

  describe('constructor', () => {
    it('constructs with defaults', () => {
      expect(new HexClient()).toBeInstanceOf(HexClient);
    });

    it('accepts custom baseUrl', () => {
      expect(new HexClient({ baseUrl: 'https://my-hex-mirror.example.com' })).toBeInstanceOf(
        HexClient,
      );
    });

    it('strips trailing slash from baseUrl', async () => {
      const client = new HexClient({ baseUrl: 'https://hex.pm/api/' });

      mockResponse(packagesFixture);
      await client.packages({ search: 'phoenix' });
      const url = mockFetch.mock.calls[0][0] as string;

      expect(url).toMatch(/^https:\/\/hex\.pm\/api\/packages/);
    });
  });

  describe('package()', () => {
    it('returns an object with get, versions, release, and latestStable methods', () => {
      const pkg = hex.package('phoenix');

      expect(pkg).toBeDefined();
      expect(typeof pkg.get).toBe('function');
      expect(typeof pkg.versions).toBe('function');
      expect(typeof pkg.release).toBe('function');
      expect(typeof pkg.latestStable).toBe('function');
    });
  });

  describe('packages()', () => {
    it('calls GET /packages', async () => {
      mockResponse(packagesFixture);
      await hex.packages();
      const url = mockFetch.mock.calls[0][0] as string;

      expect(url).toContain('/packages');
    });

    it('includes search param when provided', async () => {
      mockResponse(packagesFixture);
      await hex.packages({ search: 'phoenix' });
      const url = mockFetch.mock.calls[0][0] as string;

      expect(url).toContain('search=phoenix');
    });

    it('includes page param when provided', async () => {
      mockResponse(packagesFixture);
      await hex.packages({ page: 2 });
      const url = mockFetch.mock.calls[0][0] as string;

      expect(url).toContain('page=2');
    });

    it('includes per_page param when provided', async () => {
      mockResponse(packagesFixture);
      await hex.packages({ per_page: 50 });
      const url = mockFetch.mock.calls[0][0] as string;

      expect(url).toContain('per_page=50');
    });

    it('omits optional params when not provided', async () => {
      mockResponse(packagesFixture);
      await hex.packages();
      const url = mockFetch.mock.calls[0][0] as string;

      expect(url).not.toContain('search=');
      expect(url).not.toContain('page=');
      expect(url).not.toContain('per_page=');
    });

    it('returns an array of packages', async () => {
      mockResponse(packagesFixture);
      const results = await hex.packages({ search: 'phoenix' });

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('phoenix');
      expect(results[1].name).toBe('ecto');
    });

    it('throws HexApiError on non-2xx', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: jest.fn(),
      });
      await expect(hex.packages()).rejects.toThrow(HexApiError);
    });

    it('passes signal to fetch', async () => {
      mockResponse(packagesFixture);
      const controller = new AbortController();

      await hex.packages({}, controller.signal);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });
  });

  describe('on() event emitter', () => {
    it('emits request event on success', async () => {
      mockResponse(packagesFixture);
      const events: unknown[] = [];

      hex.on('request', (e) => events.push(e));
      await hex.packages({ search: 'phoenix' });
      expect(events).toHaveLength(1);
      const event = events[0] as { url: string; method: string; statusCode: number };

      expect(event.method).toBe('GET');
      expect(event.statusCode).toBe(200);
    });

    it('emits request event with error on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: jest.fn(),
      });
      const events: unknown[] = [];

      hex.on('request', (e) => events.push(e));
      await expect(hex.packages({ search: 'nonexistent' })).rejects.toThrow(HexApiError);
      const event = events[0] as { error: Error };

      expect(event.error).toBeInstanceOf(HexApiError);
    });

    it('supports method chaining', () => {
      expect(hex.on('request', () => undefined)).toBe(hex);
    });

    it('calls multiple listeners in registration order', async () => {
      mockResponse(packagesFixture);
      const calls: number[] = [];

      hex
        .on('request', () => calls.push(1))
        .on('request', () => calls.push(2))
        .on('request', () => calls.push(3));
      await hex.packages({ search: 'phoenix' });
      expect(calls).toEqual([1, 2, 3]);
    });

    it('event includes url, startedAt, finishedAt, durationMs', async () => {
      mockResponse(packagesFixture);
      const events: unknown[] = [];

      hex.on('request', (e) => events.push(e));
      await hex.packages({ search: 'phoenix' });
      const e = events[0] as {
        url: string;
        startedAt: Date;
        finishedAt: Date;
        durationMs: number;
      };

      expect(typeof e.url).toBe('string');
      expect(e.startedAt).toBeInstanceOf(Date);
      expect(e.finishedAt).toBeInstanceOf(Date);
      expect(typeof e.durationMs).toBe('number');
    });

    it('propagates AbortError and emits request event', async () => {
      const abortError = new DOMException('The operation was aborted.', 'AbortError');

      mockFetch.mockRejectedValueOnce(abortError);
      const events: unknown[] = [];

      hex.on('request', (e) => events.push(e));
      const controller = new AbortController();

      await expect(hex.packages({}, controller.signal)).rejects.toThrow(
        'The operation was aborted.',
      );
      expect(events).toHaveLength(1);
      const event = events[0] as { error: Error };

      expect(event.error.message).toContain('The operation was aborted.');
    });
  });

  describe('Accept header', () => {
    it('sends Accept: application/json header', async () => {
      mockResponse(packagesFixture);
      await hex.packages({ search: 'phoenix' });
      const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;

      expect(headers.Accept).toBe('application/json');
    });
  });
});
