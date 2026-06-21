import { HexClient } from '../dist/index.js';

const hex = new HexClient();

hex.on('request', (e) => {
  const status = e.error ? `ERROR ${e.error.message}` : e.statusCode;
  console.log(`  [${status}] ${e.method} ${e.url} (${e.durationMs}ms)`);
});

async function test() {
  // --- packages() ---
  const results = await hex.packages({ search: 'phoenix', per_page: 5 });
  console.log(`Search "phoenix" — ${results.length} results:`);
  for (const pkg of results) {
    console.log(` - ${pkg.name}@${pkg.latest_stable_version ?? pkg.latest_version}`);
  }

  // --- package().get() ---
  const pkg = await hex.package('phoenix').get();
  console.log(`\nphoenix package:`);
  console.log(`  latest stable: ${pkg.latest_stable_version}`);
  console.log(`  description: ${pkg.meta.description}`);
  console.log(`  licenses: ${pkg.meta.licenses.join(', ')}`);
  console.log(`  releases: ${pkg.releases.length}`);

  // --- package().versions() ---
  const versions = await hex.package('phoenix').versions();
  console.log(`\nphoenix versions count: ${versions.length}`);
  console.log(`Last 3: ${versions.slice(-3).join(', ')}`);

  // --- package().release(version) ---
  const latestStable = pkg.latest_stable_version ?? versions.at(-1);
  if (latestStable) {
    const release = await hex.package('phoenix').release(latestStable);
    console.log(`\nphoenix@${release.version}:`);
    console.log(`  checksum: ${release.checksum}`);
    console.log(`  has_docs: ${release.has_docs}`);
    console.log(`  build_tools: ${release.meta.build_tools.join(', ')}`);
    console.log(`  elixir: ${release.meta.elixir}`);
    console.log(`  retired: ${release.retirement !== null}`);
  }

  // --- package().latestStable() ---
  const stable = await hex.package('ecto').latestStable();
  console.log(`\necto latest stable: ${stable}`);
}

try {
  await test();
} catch (err) {
  console.error(err);
  process.exit(1);
}
