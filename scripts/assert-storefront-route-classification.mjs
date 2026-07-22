import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const requiredStorefrontRoutes = [
  '/[locale]',
  '/[locale]/catalog',
  '/[locale]/category/[categorySlug]',
  '/[locale]/collection/[collectionSlug]',
  '/[locale]/technique/[techniqueSlug]',
  '/[locale]/tag/[tagSlug]',
  '/[locale]/product/[productSlug]'
];

const prerenderedMarkers = new Set(['○', '●']);

export function parseRouteClassifications(buildOutput) {
  const classifications = new Map();

  for (const line of buildOutput.split(/\r?\n/u)) {
    const match = line.match(/^[\s│├└┌┬─]*([○●ƒ◐])\s+(\/\S*)/u);
    if (!match) continue;

    const [, marker, route] = match;
    classifications.set(route, {
      marker,
      classification: prerenderedMarkers.has(marker) ? 'static-or-isr' : 'dynamic'
    });
  }

  return classifications;
}

export function assertStorefrontRoutesAreStaticOrIsr(buildOutput) {
  const classifications = parseRouteClassifications(buildOutput);
  const problems = [];

  for (const route of requiredStorefrontRoutes) {
    const result = classifications.get(route);
    if (!result) {
      problems.push(`${route}: missing from the production build route table`);
    } else if (result.classification !== 'static-or-isr') {
      problems.push(`${route}: ${result.marker} is request-time dynamic`);
    }
  }

  assert.deepEqual(
    problems,
    [],
    `Storefront static/ISR release gate failed:\n${problems.map((problem) => `- ${problem}`).join('\n')}`
  );
  return classifications;
}

function selfTest() {
  const staticFixture = `
Route (app)                              Revalidate  Expire
┌ ○ /_not-found
├ ● /[locale]                                  5m      1y
├ ● /[locale]/catalog                          5m      1y
├ ● /[locale]/category/[categorySlug]          5m      1y
├ ● /[locale]/collection/[collectionSlug]      5m      1y
├ ● /[locale]/technique/[techniqueSlug]        5m      1y
├ ● /[locale]/tag/[tagSlug]                    5m      1y
└ ● /[locale]/product/[productSlug]             5m      1y

○  (Static) prerendered as static content
●  (SSG) prerendered as static HTML
ƒ  (Dynamic) server-rendered on demand
`;
  const dynamicCatalogFixture = staticFixture.replace('● /[locale]/catalog', 'ƒ /[locale]/catalog');
  const missingTagFixture = staticFixture.replace(/^.*\/\[locale\]\/tag\/\[tagSlug\].*\r?\n/mu, '');

  const parsed = assertStorefrontRoutesAreStaticOrIsr(staticFixture);
  assert.equal(parsed.get('/[locale]')?.classification, 'static-or-isr');
  assert.equal(parsed.get('/[locale]/catalog')?.marker, '●');
  assert.throws(
    () => assertStorefrontRoutesAreStaticOrIsr(dynamicCatalogFixture),
    /catalog.*request-time dynamic/su
  );
  assert.throws(
    () => assertStorefrontRoutesAreStaticOrIsr(missingTagFixture),
    /tag.*missing from the production build route table/su
  );
  process.stdout.write('storefront route-classification self-test passed\n');
}

function runProductionBuild() {
  const command = process.platform === 'win32' ? (process.env.ComSpec ?? 'cmd.exe') : 'npm';
  const args =
    process.platform === 'win32' ? ['/d', '/s', '/c', 'npm run build'] : ['run', 'build'];
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 50 * 1024 * 1024
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  process.stdout.write(output);

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Production build failed with exit code ${result.status ?? 'unknown'}`);
  }

  assertStorefrontRoutesAreStaticOrIsr(output);
  process.stdout.write('storefront production routes are static/ISR\n');
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  try {
    if (process.argv.includes('--self-test')) selfTest();
    else runProductionBuild();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
