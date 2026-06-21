export interface HexReleasePublisher {
  username: string;
  email: string;
}

export interface HexReleaseRetirement {
  reason: string;
  message: string | null;
}

export interface HexReleaseMeta {
  app: string | null;
  description: string | null;
  build_tools: string[];
  elixir: string | null;
  files: string[];
  licenses: string[];
  links: Record<string, string>;
}

export interface HexRelease {
  version: string;
  url: string;
  checksum: string;
  has_docs: boolean;
  inserted_at: string;
  updated_at: string;
  publisher: HexReleasePublisher | null;
  retirement: HexReleaseRetirement | null;
  meta: HexReleaseMeta;
}
