export interface HexPackageMeta {
  description: string | null;
  licenses: string[];
  links: Record<string, string>;
  maintainers: Array<{ username: string; email: string }>;
}

export interface HexPackageRelease {
  version: string;
  url: string;
  has_docs: boolean;
  inserted_at: string;
  updated_at: string;
}

export interface HexPackage {
  name: string;
  url: string;
  html_url: string;
  docs_html_url: string | null;
  meta: HexPackageMeta;
  latest_stable_version: string | null;
  latest_version: string | null;
  inserted_at: string;
  updated_at: string;
  releases: HexPackageRelease[];
}

export interface HexPackageSearchParams {
  search?: string;
  page?: number;
  per_page?: number;
}
