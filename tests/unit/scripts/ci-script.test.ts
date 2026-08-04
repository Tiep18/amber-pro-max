import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';

type PackageManifest = {
  scripts?: Record<string, string>;
};

function ciSteps() {
  const manifest = JSON.parse(
    readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')
  ) as PackageManifest;

  return (manifest.scripts?.ci ?? '')
    .split('&&')
    .map((step) => step.trim())
    .filter(Boolean);
}

describe('CI database isolation', () => {
  it('resets committed pgTAP fixtures before the browser suite', () => {
    const steps = ciSteps();
    const databaseTest = steps.indexOf('npm run db:test');
    const browserTest = steps.indexOf('npm run test:e2e');

    expect(databaseTest).toBeGreaterThanOrEqual(0);
    expect(browserTest).toBeGreaterThan(databaseTest);
    expect(steps.slice(databaseTest + 1, browserTest)).toContain('npm run db:reset');
  });
});
