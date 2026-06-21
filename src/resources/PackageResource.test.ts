import { HexApiError, HexClient } from '../index';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockResponse<T>(data: T, status = 200): void {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Not Found',
    json: () => Promise.resolve(data),
  });
}

const packageFixture = {
  name: 'phoenix',
  url: 'https://hex.pm/api/packages/phoenix',
  html_url: 'https://hex.pm/packages/phoenix',
  docs_html_url: 'https://hexdocs.pm/phoenix',
  meta: {
    description: 'Productive web framework',
    licenses: ['MIT'],
    links: { GitHub: 'https://github.com/phoenixframework/phoenix' },
    maintainers: [{ username: 'chrismccord', email: 'chris@example.com' }],
  },
  latest_stable_version: '1.7.10',
  latest_version: '1.7.10',
  inserted_at: '2014-12-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  releases: [
    {
      version: '1.6.0',
      url: 'https://hex.pm/api/packages/phoenix/releases/1.6.0',
      has_docs: true,
      inserted_at: '2021-01-01T00:00:00Z',
      updated_at: '2021-01-01T00:00:00Z',
    },
    {
      version: '1.7.0',
      url: 'https://hex.pm/api/packages/phoenix/releases/1.7.0',
      has_docs: true,
      inserted_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    },
    {
      version: '1.7.10',
      url: 'https://hex.pm/api/packages/phoenix/releases/1.7.10',
      has_docs: true,
      inserted_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ],
};

const releaseFixture = {
  version: '1.7.10',
  url: 'https://hex.pm/api/packages/phoenix/releases/1.7.10',
  checksum: 'abc123',
  has_docs: true,
  inserted_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  publisher: { username: 'chrismccord', email: 'chris@example.com' },
  retirement: null,
  meta: {
    app: 'phoenix',
    description: 'Productive web framework',
    build_tools: ['mix'],
    elixir: '~> 1.14',
    files: ['lib', 'mix.exs'],
    licenses: ['MIT'],
    links: {},
  },
};

describe('PackageResource', () => {
  let hex: HexClient;

  beforeEach(() => {
    mockFetch.mockClear();
    hex = new HexClient();
  });

  describe('get()', () => {
    it('fetches package by name from GET /packages/:name', async () => {
      mockResponse(packageFixture);
      const pkg = await hex.package('phoenix').get();
      expect(pkg.name).toBe('phoenix');
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('/packages/phoenix');
    });

    it('returns the full HexPackage shape', async () => {
      mockResponse(packageFixture);
      const pkg = await hex.package('phoenix').get();
      expect(pkg.meta.licenses).toContain('MIT');
      expect(pkg.releases).toHaveLength(3);
    });

    it('throws HexApiError on 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: jest.fn(),
      });
      await expect(hex.package('nonexistent').get()).rejects.toThrow(HexApiError);
    });

    it('passes AbortSignal to fetch', async () => {
      mockResponse(packageFixture);
      const controller = new AbortController();
      await hex.package('phoenix').get(controller.signal);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });
  });

  describe('versions()', () => {
    it('returns array of version strings from releases array', async () => {
      mockResponse(packageFixture);
      const versions = await hex.package('phoenix').versions();
      expect(versions).toEqual(['1.6.0', '1.7.0', '1.7.10']);
    });

    it('calls GET /packages/:name (reuses package endpoint)', async () => {
      mockResponse(packageFixture);
      await hex.package('phoenix').versions();
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('/packages/phoenix');
      expect(url).not.toContain('/releases');
    });

    it('throws HexApiError on 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: jest.fn(),
      });
      await expect(hex.package('nonexistent').versions()).rejects.toThrow(HexApiError);
    });

    it('passes AbortSignal to fetch', async () => {
      mockResponse(packageFixture);
      const controller = new AbortController();
      await hex.package('phoenix').versions(controller.signal);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });
  });

  describe('release(version)', () => {
    it('fetches specific release from GET /packages/:name/releases/:version', async () => {
      mockResponse(releaseFixture);
      const release = await hex.package('phoenix').release('1.7.10');
      expect(release.version).toBe('1.7.10');
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('/packages/phoenix/releases/1.7.10');
    });

    it('returns the full HexRelease shape', async () => {
      mockResponse(releaseFixture);
      const release = await hex.package('phoenix').release('1.7.10');
      expect(release.checksum).toBe('abc123');
      expect(release.publisher?.username).toBe('chrismccord');
      expect(release.retirement).toBeNull();
      expect(release.meta.build_tools).toContain('mix');
    });

    it('handles null publisher', async () => {
      mockResponse({ ...releaseFixture, publisher: null });
      const release = await hex.package('phoenix').release('1.7.10');
      expect(release.publisher).toBeNull();
    });

    it('handles retirement info', async () => {
      mockResponse({
        ...releaseFixture,
        retirement: { reason: 'security', message: 'Use 1.7.11 instead' },
      });
      const release = await hex.package('phoenix').release('1.7.10');
      expect(release.retirement?.reason).toBe('security');
    });

    it('throws HexApiError on 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: jest.fn(),
      });
      await expect(hex.package('phoenix').release('99.0.0')).rejects.toThrow(HexApiError);
    });

    it('passes AbortSignal to fetch', async () => {
      mockResponse(releaseFixture);
      const controller = new AbortController();
      await hex.package('phoenix').release('1.7.10', controller.signal);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });
  });

  describe('latestStable()', () => {
    it('returns latest_stable_version from package data', async () => {
      mockResponse(packageFixture);
      const version = await hex.package('phoenix').latestStable();
      expect(version).toBe('1.7.10');
    });

    it('returns null when no stable version exists', async () => {
      mockResponse({ ...packageFixture, latest_stable_version: null });
      const version = await hex.package('phoenix').latestStable();
      expect(version).toBeNull();
    });

    it('passes AbortSignal to fetch', async () => {
      mockResponse(packageFixture);
      const controller = new AbortController();
      await hex.package('phoenix').latestStable(controller.signal);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });
  });
});
