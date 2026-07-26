import {mkdtemp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach, describe, expect, it} from 'vitest';
import {
  cleanPlaywrightBuildArtifacts,
  nextBuildDirectory
} from '../../../scripts/start-playwright-server.mjs';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, {recursive: true, force: true}))
  );
});

describe('Playwright development server preparation', () => {
  it('removes only the generated .next directory before starting Next dev', async () => {
    const root = await mkdtemp(join(tmpdir(), 'amber-playwright-server-'));
    temporaryRoots.push(root);
    const buildDirectory = join(root, '.next');
    const sourceFile = join(root, 'keep-me.txt');

    await mkdir(join(buildDirectory, 'server'), {recursive: true});
    await writeFile(join(buildDirectory, 'server', 'stale-build.txt'), 'production build');
    await writeFile(sourceFile, 'source');

    await cleanPlaywrightBuildArtifacts(root);

    await expect(readFile(join(buildDirectory, 'server', 'stale-build.txt'))).rejects.toMatchObject({
      code: 'ENOENT'
    });
    await expect(readFile(sourceFile, 'utf8')).resolves.toBe('source');
  });

  it('always resolves the cleanup target to the project-local .next directory', () => {
    const root = join(tmpdir(), 'amber-playwright-root');

    expect(nextBuildDirectory(root)).toBe(join(root, '.next'));
  });
});
